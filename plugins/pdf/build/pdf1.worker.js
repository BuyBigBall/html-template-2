= {
    get length() {
      return this._map.length;
    },

    forEach: function(callback) {
      for (var charCode in this._map) {
        callback(charCode, this._map[charCode].charCodeAt(0));
      }
    },

    has: function(i) {
      return this._map[i] !== undefined;
    },

    get: function(i) {
      return this._map[i];
    },

    charCodeOf: function(v) {
      return this._map.indexOf(v);
    }
  };

  return ToUnicodeMap;
})();

var IdentityToUnicodeMap = (function IdentityToUnicodeMapClosure() {
  function IdentityToUnicodeMap(firstChar, lastChar) {
    this.firstChar = firstChar;
    this.lastChar = lastChar;
  }

  IdentityToUnicodeMap.prototype = {
    get length() {
      return (this.lastChar + 1) - this.firstChar;
    },

    forEach: function (callback) {
      for (var i = this.firstChar, ii = this.lastChar; i <= ii; i++) {
        callback(i, i);
      }
    },

    has: function (i) {
      return this.firstChar <= i && i <= this.lastChar;
    },

    get: function (i) {
      if (this.firstChar <= i && i <= this.lastChar) {
        return String.fromCharCode(i);
      }
      return undefined;
    },

    charCodeOf: function (v) {
      return (isInt(v) && v >= this.firstChar && v <= this.lastChar) ? v : -1;
    }
  };

  return IdentityToUnicodeMap;
})();

var OpenTypeFileBuilder = (function OpenTypeFileBuilderClosure() {
  function writeInt16(dest, offset, num) {
    dest[offset] = (num >> 8) & 0xFF;
    dest[offset + 1] = num & 0xFF;
  }

  function writeInt32(dest, offset, num) {
    dest[offset] = (num >> 24) & 0xFF;
    dest[offset + 1] = (num >> 16) & 0xFF;
    dest[offset + 2] = (num >> 8) & 0xFF;
    dest[offset + 3] = num & 0xFF;
  }

  function writeData(dest, offset, data) {
    var i, ii;
    if (data instanceof Uint8Array) {
      dest.set(data, offset);
    } else if (typeof data === 'string') {
      for (i = 0, ii = data.length; i < ii; i++) {
        dest[offset++] = data.charCodeAt(i) & 0xFF;
      }
    } else {
      // treating everything else as array
      for (i = 0, ii = data.length; i < ii; i++) {
        dest[offset++] = data[i] & 0xFF;
      }
    }
  }

  function OpenTypeFileBuilder(sfnt) {
    this.sfnt = sfnt;
    this.tables = Object.create(null);
  }

  OpenTypeFileBuilder.getSearchParams =
      function OpenTypeFileBuilder_getSearchParams(entriesCount, entrySize) {
    var maxPower2 = 1, log2 = 0;
    while ((maxPower2 ^ entriesCount) > maxPower2) {
      maxPower2 <<= 1;
      log2++;
    }
    var searchRange = maxPower2 * entrySize;
    return {
      range: searchRange,
      entry: log2,
      rangeShift: entrySize * entriesCount - searchRange
    };
  };

  var OTF_HEADER_SIZE = 12;
  var OTF_TABLE_ENTRY_SIZE = 16;

  OpenTypeFileBuilder.prototype = {
    toArray: function OpenTypeFileBuilder_toArray() {
      var sfnt = this.sfnt;

      // Tables needs to be written by ascendant alphabetic order
      var tables = this.tables;
      var tablesNames = Object.keys(tables);
      tablesNames.sort();
      var numTables = tablesNames.length;

      var i, j, jj, table, tableName;
      // layout the tables data
      var offset = OTF_HEADER_SIZE + numTables * OTF_TABLE_ENTRY_SIZE;
      var tableOffsets = [offset];
      for (i = 0; i < numTables; i++) {
        table = tables[tablesNames[i]];
        var paddedLength = ((table.length + 3) & ~3) >>> 0;
        offset += paddedLength;
        tableOffsets.push(offset);
      }

      var file = new Uint8Array(offset);
      // write the table data first (mostly for checksum)
      for (i = 0; i < numTables; i++) {
        table = tables[tablesNames[i]];
        writeData(file, tableOffsets[i], table);
      }

      // sfnt version (4 bytes)
      if (sfnt === 'true') {
        // Windows hates the Mac TrueType sfnt version number
        sfnt = string32(0x00010000);
      }
      file[0] = sfnt.charCodeAt(0) & 0xFF;
      file[1] = sfnt.charCodeAt(1) & 0xFF;
      file[2] = sfnt.charCodeAt(2) & 0xFF;
      file[3] = sfnt.charCodeAt(3) & 0xFF;

      // numTables (2 bytes)
      writeInt16(file, 4, numTables);

      var searchParams = OpenTypeFileBuilder.getSearchParams(numTables, 16);

      // searchRange (2 bytes)
      writeInt16(file, 6, searchParams.range);
      // entrySelector (2 bytes)
      writeInt16(file, 8, searchParams.entry);
      // rangeShift (2 bytes)
      writeInt16(file, 10, searchParams.rangeShift);

      offset = OTF_HEADER_SIZE;
      // writing table entries
      for (i = 0; i < numTables; i++) {
        tableName = tablesNames[i];
        file[offset] = tableName.charCodeAt(0) & 0xFF;
        file[offset + 1] = tableName.charCodeAt(1) & 0xFF;
        file[offset + 2] = tableName.charCodeAt(2) & 0xFF;
        file[offset + 3] = tableName.charCodeAt(3) & 0xFF;

        // checksum
        var checksum = 0;
        for (j = tableOffsets[i], jj = tableOffsets[i + 1]; j < jj; j += 4) {
          var quad = readUint32(file, j);
          checksum = (checksum + quad) >>> 0;
        }
        writeInt32(file, offset + 4, checksum);

        // offset
        writeInt32(file, offset + 8, tableOffsets[i]);
        // length
        writeInt32(file, offset + 12, tables[tableName].length);

        offset += OTF_TABLE_ENTRY_SIZE;
      }
      return file;
    },

    addTable: function OpenTypeFileBuilder_addTable(tag, data) {
      if (tag in this.tables) {
        throw new Error('Table ' + tag + ' already exists');
      }
      this.tables[tag] = data;
    }
  };

  return OpenTypeFileBuilder;
})();

// Problematic Unicode characters in the fonts that needs to be moved to avoid
// issues when they are painted on the canvas, e.g. complex-script shaping or
// control/whitespace characters. The ranges are listed in pairs: the first item
// is a code of the first problematic code, the second one is the next
// non-problematic code. The ranges must be in sorted order.
var ProblematicCharRanges = new Int32Array([
  // Control characters.
  0x0000, 0x0020,
  0x007F, 0x00A1,
  0x00AD, 0x00AE,
  // Chars that is used in complex-script shaping.
  0x0600, 0x0780,
  0x08A0, 0x10A0,
  0x1780, 0x1800,
  // General punctuation chars.
  0x2000, 0x2010,
  0x2011, 0x2012,
  0x2028, 0x2030,
  0x205F, 0x2070,
  0x25CC, 0x25CD,
  // Chars that is used in complex-script shaping.
  0xAA60, 0xAA80,
  // Specials Unicode block.
  0xFFF0, 0x10000
]);

/**
 * 'Font' is the class the outside world should use, it encapsulate all the font
 * decoding logics whatever type it is (assuming the font type is supported).
 *
 * For example to read a Type1 font and to attach it to the document:
 *   var type1Font = new Font("MyFontName", binaryFile, propertiesObject);
 *   type1Font.bind();
 */
var Font = (function FontClosure() {
  function Font(name, file, properties) {
    var charCode, glyphName, unicode;

    this.name = name;
    this.loadedName = properties.loadedName;
    this.isType3Font = properties.isType3Font;
    this.sizes = [];
    this.missingFile = false;

    this.glyphCache = Object.create(null);

    var names = name.split('+');
    names = names.length > 1 ? names[1] : names[0];
    names = names.split(/[-,_]/g)[0];
    this.isSerifFont = !!(properties.flags & FontFlags.Serif);
    this.isSymbolicFont = !!(properties.flags & FontFlags.Symbolic);
    this.isMonospace = !!(properties.flags & FontFlags.FixedPitch);

    var type = properties.type;
    var subtype = properties.subtype;
    this.type = type;

    this.fallbackName = (this.isMonospace ? 'monospace' :
                         (this.isSerifFont ? 'serif' : 'sans-serif'));

    this.differences = properties.differences;
    this.widths = properties.widths;
    this.defaultWidth = properties.defaultWidth;
    this.composite = properties.composite;
    this.wideChars = properties.wideChars;
    this.cMap = properties.cMap;
    this.ascent = properties.ascent / PDF_GLYPH_SPACE_UNITS;
    this.descent = properties.descent / PDF_GLYPH_SPACE_UNITS;
    this.fontMatrix = properties.fontMatrix;
    this.bbox = properties.bbox;

    this.toUnicode = properties.toUnicode;

    this.toFontChar = [];

    if (properties.type === 'Type3') {
      for (charCode = 0; charCode < 256; charCode++) {
        this.toFontChar[charCode] = (this.differences[charCode] ||
                                     properties.defaultEncoding[charCode]);
      }
      this.fontType = FontType.TYPE3;
      return;
    }

    this.cidEncoding = properties.cidEncoding;
    this.vertical = properties.vertical;
    if (this.vertical) {
      this.vmetrics = properties.vmetrics;
      this.defaultVMetrics = properties.defaultVMetrics;
    }
    var glyphsUnicodeMap;
    if (!file || file.isEmpty) {
      if (file) {
        // Some bad PDF generators will include empty font files,
        // attempting to recover by assuming that no file exists.
        warn('Font file is empty in "' + name + '" (' + this.loadedName + ')');
      }

      this.missingFile = true;
      // The file data is not specified. Trying to fix the font name
      // to be used with the canvas.font.
      var fontName = name.replace(/[,_]/g, '-');
      var stdFontMap = getStdFontMap(), nonStdFontMap = getNonStdFontMap();
      var isStandardFont = !!stdFontMap[fontName] ||
        !!(nonStdFontMap[fontName] && stdFontMap[nonStdFontMap[fontName]]);
      fontName = stdFontMap[fontName] || nonStdFontMap[fontName] || fontName;

      this.bold = (fontName.search(/bold/gi) !== -1);
      this.italic = ((fontName.search(/oblique/gi) !== -1) ||
                     (fontName.search(/italic/gi) !== -1));

      // Use 'name' instead of 'fontName' here because the original
      // name ArialBlack for example will be replaced by Helvetica.
      this.black = (name.search(/Black/g) !== -1);

      // if at least one width is present, remeasure all chars when exists
      this.remeasure = Object.keys(this.widths).length > 0;
      if (isStandardFont && type === 'CIDFontType2' &&
          properties.cidEncoding.indexOf('Identity-') === 0) {
        var GlyphMapForStandardFonts = getGlyphMapForStandardFonts();
        // Standard fonts might be embedded as CID font without glyph mapping.
        // Building one based on GlyphMapForStandardFonts.
        var map = [];
        for (charCode in GlyphMapForStandardFonts) {
          map[+charCode] = GlyphMapForStandardFonts[charCode];
        }
        if (/ArialBlack/i.test(name)) {
          var SupplementalGlyphMapForArialBlack =
            getSupplementalGlyphMapForArialBlack();
          for (charCode in SupplementalGlyphMapForArialBlack) {
            map[+charCode] = SupplementalGlyphMapForArialBlack[charCode];
          }
        }
        var isIdentityUnicode = this.toUnicode instanceof IdentityToUnicodeMap;
        if (!isIdentityUnicode) {
          this.toUnicode.forEach(function(charCode, unicodeCharCode) {
            map[+charCode] = unicodeCharCode;
          });
        }
        this.toFontChar = map;
        this.toUnicode = new ToUnicodeMap(map);
      } else if (/Symbol/i.test(fontName)) {
        this.toFontChar = buildToFontChar(SymbolSetEncoding, getGlyphsUnicode(),
                                          properties.differences);
      } else if (/Dingbats/i.test(fontName)) {
        if (/Wingdings/i.test(name)) {
          warn('Non-embedded Wingdings font, falling back to ZapfDingbats.');
        }
        this.toFontChar = buildToFontChar(ZapfDingbatsEncoding,
                                          getDingbatsGlyphsUnicode(),
                                          properties.differences);
      } else if (isStandardFont) {
        this.toFontChar = buildToFontChar(properties.defaultEncoding,
                                          getGlyphsUnicode(),
                                          properties.differences);
      } else {
        glyphsUnicodeMap = getGlyphsUnicode();
        this.toUnicode.forEach(function(charCode, unicodeCharCode) {
          if (!this.composite) {
            glyphName = (properties.differences[charCode] ||
                         properties.defaultEncoding[charCode]);
            unicode = getUnicodeForGlyph(glyphName, glyphsUnicodeMap);
            if (unicode !== -1) {
              unicodeCharCode = unicode;
            }
          }
          this.toFontChar[charCode] = unicodeCharCode;
        }.bind(this));
      }
      this.loadedName = fontName.split('-')[0];
      this.loading = false;
      this.fontType = getFontType(type, subtype);
      return;
    }

    // Some fonts might use wrong font types for Type1C or CIDFontType0C
    if (subtype === 'Type1C' && (type !== 'Type1' && type !== 'MMType1')) {
      // Some TrueType fonts by mistake claim Type1C
      if (isTrueTypeFile(file)) {
        subtype = 'TrueType';
      } else {
        type = 'Type1';
      }
    }
    if (subtype === 'CIDFontType0C' && type !== 'CIDFontType0') {
      type = 'CIDFontType0';
    }
    if (subtype === 'OpenType') {
      type = 'OpenType';
    }
    // Some CIDFontType0C fonts by mistake claim CIDFontType0.
    if (type === 'CIDFontType0') {
      if (isType1File(file)) {
        subtype = 'CIDFontType0';
      } else if (isOpenTypeFile(file)) {
        // Sometimes the type/subtype can be a complete lie (see issue6782.pdf).
        type = subtype = 'OpenType';
      } else {
        subtype = 'CIDFontType0C';
      }
    }

    var data;
    switch (type) {
      case 'MMType1':
        info('MMType1 font (' + name + '), falling back to Type1.');
        /* falls through */
      case 'Type1':
      case 'CIDFontType0':
        this.mimetype = 'font/opentype';

        var cff = (subtype === 'Type1C' || subtype === 'CIDFontType0C') ?
          new CFFFont(file, properties) : new Type1Font(name, file, properties);

        adjustWidths(properties);

        // Wrap the CFF data inside an OTF font file
        data = this.convert(name, cff, properties);
        break;

      case 'OpenType':
      case 'TrueType':
      case 'CIDFontType2':
        this.mimetype = 'font/opentype';

        // Repair the TrueType file. It is can be damaged in the point of
        // view of the sanitizer
        data = this.checkAndRepair(name, file, properties);
        if (this.isOpenType) {
          adjustWidths(properties);

          type = 'OpenType';
        }
        break;

      default:
        error('Font ' + type + ' is not supported');
        break;
    }

    this.data = data;
    this.fontType = getFontType(type, subtype);

    // Transfer some properties again that could change during font conversion
    this.fontMatrix = properties.fontMatrix;
    this.widths = properties.widths;
    this.defaultWidth = properties.defaultWidth;
    this.encoding = properties.baseEncoding;
    this.seacMap = properties.seacMap;

    this.loading = true;
  }

  Font.getFontID = (function () {
    var ID = 1;
    return function Font_getFontID() {
      return String(ID++);
    };
  })();

  function int16(b0, b1) {
    return (b0 << 8) + b1;
  }

  function signedInt16(b0, b1) {
    var value = (b0 << 8) + b1;
    return value & (1 << 15) ? value - 0x10000 : value;
  }

  function int32(b0, b1, b2, b3) {
    return (b0 << 24) + (b1 << 16) + (b2 << 8) + b3;
  }

  function string16(value) {
    return String.fromCharCode((value >> 8) & 0xff, value & 0xff);
  }

  function safeString16(value) {
    // clamp value to the 16-bit int range
    value = (value > 0x7FFF ? 0x7FFF : (value < -0x8000 ? -0x8000 : value));
    return String.fromCharCode((value >> 8) & 0xff, value & 0xff);
  }

  function isTrueTypeFile(file) {
    var header = file.peekBytes(4);
    return readUint32(header, 0) === 0x00010000;
  }

  function isOpenTypeFile(file) {
    var header = file.peekBytes(4);
    return bytesToString(header) === 'OTTO';
  }

  function isType1File(file) {
    var header = file.peekBytes(2);
    // All Type1 font programs must begin with the comment '%!' (0x25 + 0x21).
    if (header[0] === 0x25 && header[1] === 0x21) {
      return true;
    }
    // ... obviously some fonts violate that part of the specification,
    // please refer to the comment in |Type1Font| below.
    if (header[0] === 0x80 && header[1] === 0x01) { // pfb file header.
      return true;
    }
    return false;
  }

  function buildToFontChar(encoding, glyphsUnicodeMap, differences) {
    var toFontChar = [], unicode;
    for (var i = 0, ii = encoding.length; i < ii; i++) {
      unicode = getUnicodeForGlyph(encoding[i], glyphsUnicodeMap);
      if (unicode !== -1) {
        toFontChar[i] = unicode;
      }
    }
    for (var charCode in differences) {
      unicode = getUnicodeForGlyph(differences[charCode], glyphsUnicodeMap);
      if (unicode !== -1) {
        toFontChar[+charCode] = unicode;
      }
    }
    return toFontChar;
  }

  /**
   * Helper function for |adjustMapping|.
   * @return {boolean}
   */
  function isProblematicUnicodeLocation(code) {
    // Using binary search to find a range start.
    var i = 0, j = ProblematicCharRanges.length - 1;
    while (i < j) {
      var c = (i + j + 1) >> 1;
      if (code < ProblematicCharRanges[c]) {
        j = c - 1;
      } else {
        i = c;
      }
    }
    // Even index means code in problematic range.
    return !(i & 1);
  }

  /**
   * Rebuilds the char code to glyph ID map by trying to replace the char codes
   * with their unicode value. It also moves char codes that are in known
   * problematic locations.
   * @return {Object} Two properties:
   * 'toFontChar' - maps original char codes(the value that will be read
   * from commands such as show text) to the char codes that will be used in the
   * font that we build
   * 'charCodeToGlyphId' - maps the new font char codes to glyph ids
   */
  function adjustMapping(charCodeToGlyphId, properties) {
    var toUnicode = properties.toUnicode;
    var isSymbolic = !!(properties.flags & FontFlags.Symbolic);
    var isIdentityUnicode =
      properties.toUnicode instanceof IdentityToUnicodeMap;
    var newMap = Object.create(null);
    var toFontChar = [];
    var usedFontCharCodes = [];
    var nextAvailableFontCharCode = PRIVATE_USE_OFFSET_START;
    for (var originalCharCode in charCodeToGlyphId) {
      originalCharCode |= 0;
      var glyphId = charCodeToGlyphId[originalCharCode];
      var fontCharCode = originalCharCode;
      // First try to map the value to a unicode position if a non identity map
      // was created.
      if (!isIdentityUnicode && toUnicode.has(originalCharCode)) {
        var unicode = toUnicode.get(fontCharCode);
        // TODO: Try to map ligatures to the correct spot.
        if (unicode.length === 1) {
          fontCharCode = unicode.charCodeAt(0);
        }
      }
      // Try to move control characters, special characters and already mapped
      // characters to the private use area since they will not be drawn by
      // canvas if left in their current position. Also, move characters if the
      // font was symbolic and there is only an identity unicode map since the
      // characters probably aren't in the correct position (fixes an issue
      // with firefox and thuluthfont).
      if ((usedFontCharCodes[fontCharCode] !== undefined ||
           isProblematicUnicodeLocation(fontCharCode) ||
           (isSymbolic && isIdentityUnicode)) &&
          nextAvailableFontCharCode <= PRIVATE_USE_OFFSET_END) { // Room left.
        // Loop to try and find a free spot in the private use area.
        do {
          fontCharCode = nextAvailableFontCharCode++;

          if (SKIP_PRIVATE_USE_RANGE_F000_TO_F01F && fontCharCode === 0xF000) {
            fontCharCode = 0xF020;
            nextAvailableFontCharCode = fontCharCode + 1;
          }

        } while (usedFontCharCodes[fontCharCode] !== undefined &&
                 nextAvailableFontCharCode <= PRIVATE_USE_OFFSET_END);
      }

      newMap[fontCharCode] = glyphId;
      toFontChar[originalCharCode] = fontCharCode;
      usedFontCharCodes[fontCharCode] = true;
    }
    return {
      toFontChar: toFontChar,
      charCodeToGlyphId: newMap,
      nextAvailableFontCharCode: nextAvailableFontCharCode
    };
  }

  function getRanges(glyphs, numGlyphs) {
    // Array.sort() sorts by characters, not numerically, so convert to an
    // array of characters.
    var codes = [];
    for (var charCode in glyphs) {
      // Remove an invalid glyph ID mappings to make OTS happy.
      if (glyphs[charCode] >= numGlyphs) {
        continue;
      }
      codes.push({ fontCharCode: charCode | 0, glyphId: glyphs[charCode] });
    }
    codes.sort(function fontGetRangesSort(a, b) {
      return a.fontCharCode - b.fontCharCode;
    });

    // Split the sorted codes into ranges.
    var ranges = [];
    var length = codes.length;
    for (var n = 0; n < length; ) {
      var start = codes[n].fontCharCode;
      var codeIndices = [codes[n].glyphId];
      ++n;
      var end = start;
      while (n < length && end + 1 === codes[n].fontCharCode) {
        codeIndices.push(codes[n].glyphId);
        ++end;
        ++n;
        if (end === 0xFFFF) {
          break;
        }
      }
      ranges.push([start, end, codeIndices]);
    }

    return ranges;
  }

  function createCmapTable(glyphs, numGlyphs) {
    var ranges = getRanges(glyphs, numGlyphs);
    var numTables = ranges[ranges.length - 1][1] > 0xFFFF ? 2 : 1;
    var cmap = '\x00\x00' + // version
               string16(numTables) +  // numTables
               '\x00\x03' + // platformID
               '\x00\x01' + // encodingID
               string32(4 + numTables * 8); // start of the table record

    var i, ii, j, jj;
    for (i = ranges.length - 1; i >= 0; --i) {
      if (ranges[i][0] <= 0xFFFF) { break; }
    }
    var bmpLength = i + 1;

    if (ranges[i][0] < 0xFFFF && ranges[i][1] === 0xFFFF) {
      ranges[i][1] = 0xFFFE;
    }
    var trailingRangesCount = ranges[i][1] < 0xFFFF ? 1 : 0;
    var segCount = bmpLength + trailingRangesCount;
    var searchParams = OpenTypeFileBuilder.getSearchParams(segCount, 2);

    // Fill up the 4 parallel arrays describing the segments.
    var startCount = '';
    var endCount = '';
    var idDeltas = '';
    var idRangeOffsets = '';
    var glyphsIds = '';
    var bias = 0;

    var range, start, end, codes;
    for (i = 0, ii = bmpLength; i < ii; i++) {
      range = ranges[i];
      start = range[0];
      end = range[1];
      startCount += string16(start);
      endCount += string16(end);
      codes = range[2];
      var contiguous = true;
      for (j = 1, jj = codes.length; j < jj; ++j) {
        if (codes[j] !== codes[j - 1] + 1) {
          contiguous = false;
          break;
        }
      }
      if (!contiguous) {
        var offset = (segCount - i) * 2 + bias * 2;
        bias += (end - start + 1);

        idDeltas += string16(0);
        idRangeOffsets += string16(offset);

        for (j = 0, jj = codes.length; j < jj; ++j) {
          glyphsIds += string16(codes[j]);
        }
      } else {
        var startCode = codes[0];

        idDeltas += string16((startCode - start) & 0xFFFF);
        idRangeOffsets += string16(0);
      }
    }

    if (trailingRangesCount > 0) {
      endCount += '\xFF\xFF';
      startCount += '\xFF\xFF';
      idDeltas += '\x00\x01';
      idRangeOffsets += '\x00\x00';
    }

    var format314 = '\x00\x00' + // language
                    string16(2 * segCount) +
                    string16(searchParams.range) +
                    string16(searchParams.entry) +
                    string16(searchParams.rangeShift) +
                    endCount + '\x00\x00' + startCount +
                    idDeltas + idRangeOffsets + glyphsIds;

    var format31012 = '';
    var header31012 = '';
    if (numTables > 1) {
      cmap += '\x00\x03' + // platformID
              '\x00\x0A' + // encodingID
              string32(4 + numTables * 8 +
                       4 + format314.length); // start of the table record
      format31012 = '';
      for (i = 0, ii = ranges.length; i < ii; i++) {
        range = ranges[i];
        start = range[0];
        codes = range[2];
        var code = codes[0];
        for (j = 1, jj = codes.length; j < jj; ++j) {
          if (codes[j] !== codes[j - 1] + 1) {
            end = range[0] + j - 1;
            format31012 += string32(start) + // startCharCode
                           string32(end) + // endCharCode
                           string32(code); // startGlyphID
            start = end + 1;
            code = codes[j];
          }
        }
        format31012 += string32(start) + // startCharCode
                       string32(range[1]) + // endCharCode
                       string32(code); // startGlyphID
      }
      header31012 = '\x00\x0C' + // format
                    '\x00\x00' + // reserved
                    string32(format31012.length + 16) + // length
                    '\x00\x00\x00\x00' + // language
                    string32(format31012.length / 12); // nGroups
    }

    return cmap + '\x00\x04' + // format
                  string16(format314.length + 4) + // length
                  format314 + header31012 + format31012;
  }

  function validateOS2Table(os2) {
    var stream = new Stream(os2.data);
    var version = stream.getUint16();
    // TODO verify all OS/2 tables fields, but currently we validate only those
    // that give us issues
    stream.getBytes(60); // skipping type, misc sizes, panose, unicode ranges
    var selection = stream.getUint16();
    if (version < 4 && (selection & 0x0300)) {
      return false;
    }
    var firstChar = stream.getUint16();
    var lastChar = stream.getUint16();
    if (firstChar > lastChar) {
      return false;
    }
    stream.getBytes(6); // skipping sTypoAscender/Descender/LineGap
    var usWinAscent = stream.getUint16();
    if (usWinAscent === 0) { // makes font unreadable by windows
      return false;
    }

    // OS/2 appears to be valid, resetting some fields
    os2.data[8] = os2.data[9] = 0; // IE rejects fonts if fsType != 0
    return true;
  }

  function createOS2Table(properties, charstrings, override) {
    override = override || {
      unitsPerEm: 0,
      yMax: 0,
      yMin: 0,
      ascent: 0,
      descent: 0
    };

    var ulUnicodeRange1 = 0;
    var ulUnicodeRange2 = 0;
    var ulUnicodeRange3 = 0;
    var ulUnicodeRange4 = 0;

    var firstCharIndex = null;
    var lastCharIndex = 0;

    if (charstrings) {
      for (var code in charstrings) {
        code |= 0;
        if (firstCharIndex > code || !firstCharIndex) {
          firstCharIndex = code;
        }
        if (lastCharIndex < code) {
          lastCharIndex = code;
        }

        var position = getUnicodeRangeFor(code);
        if (position < 32) {
          ulUnicodeRange1 |= 1 << position;
        } else if (position < 64) {
          ulUnicodeRange2 |= 1 << position - 32;
        } else if (position < 96) {
          ulUnicodeRange3 |= 1 << position - 64;
        } else if (position < 123) {
          ulUnicodeRange4 |= 1 << position - 96;
        } else {
          error('Unicode ranges Bits > 123 are reserved for internal usage');
        }
      }
    } else {
      // TODO
      firstCharIndex = 0;
      lastCharIndex = 255;
    }

    var bbox = properties.bbox || [0, 0, 0, 0];
    var unitsPerEm = (override.unitsPerEm ||
                      1 / (properties.fontMatrix || FONT_IDENTITY_MATRIX)[0]);

    // if the font units differ to the PDF glyph space units
    // then scale up the values
    var scale = (properties.ascentScaled ? 1.0 :
                 unitsPerEm / PDF_GLYPH_SPACE_UNITS);

    var typoAscent = (override.ascent ||
                      Math.round(scale * (properties.ascent || bbox[3])));
    var typoDescent = (override.descent ||
                       Math.round(scale * (properties.descent || bbox[1])));
    if (typoDescent > 0 && properties.descent > 0 && bbox[1] < 0) {
      typoDescent = -typoDescent; // fixing incorrect descent
    }
    var winAscent = override.yMax || typoAscent;
    var winDescent = -override.yMin || -typoDescent;

    return '\x00\x03' + // version
           '\x02\x24' + // xAvgCharWidth
           '\x01\xF4' + // usWeightClass
           '\x00\x05' + // usWidthClass
           '\x00\x00' + // fstype (0 to let the font loads via font-face on IE)
           '\x02\x8A' + // ySubscriptXSize
           '\x02\xBB' + // ySubscriptYSize
           '\x00\x00' + // ySubscriptXOffset
           '\x00\x8C' + // ySubscriptYOffset
           '\x02\x8A' + // ySuperScriptXSize
           '\x02\xBB' + // ySuperScriptYSize
           '\x00\x00' + // ySuperScriptXOffset
           '\x01\xDF' + // ySuperScriptYOffset
           '\x00\x31' + // yStrikeOutSize
           '\x01\x02' + // yStrikeOutPosition
           '\x00\x00' + // sFamilyClass
           '\x00\x00\x06' +
           String.fromCharCode(properties.fixedPitch ? 0x09 : 0x00) +
           '\x00\x00\x00\x00\x00\x00' + // Panose
           string32(ulUnicodeRange1) + // ulUnicodeRange1 (Bits 0-31)
           string32(ulUnicodeRange2) + // ulUnicodeRange2 (Bits 32-63)
           string32(ulUnicodeRange3) + // ulUnicodeRange3 (Bits 64-95)
           string32(ulUnicodeRange4) + // ulUnicodeRange4 (Bits 96-127)
           '\x2A\x32\x31\x2A' + // achVendID
           string16(properties.italicAngle ? 1 : 0) + // fsSelection
           string16(firstCharIndex ||
                    properties.firstChar) + // usFirstCharIndex
           string16(lastCharIndex || properties.lastChar) +  // usLastCharIndex
           string16(typoAscent) + // sTypoAscender
           string16(typoDescent) + // sTypoDescender
           '\x00\x64' + // sTypoLineGap (7%-10% of the unitsPerEM value)
           string16(winAscent) + // usWinAscent
           string16(winDescent) + // usWinDescent
           '\x00\x00\x00\x00' + // ulCodePageRange1 (Bits 0-31)
           '\x00\x00\x00\x00' + // ulCodePageRange2 (Bits 32-63)
           string16(properties.xHeight) + // sxHeight
           string16(properties.capHeight) + // sCapHeight
           string16(0) + // usDefaultChar
           string16(firstCharIndex || properties.firstChar) + // usBreakChar
           '\x00\x03';  // usMaxContext
  }

  function createPostTable(properties) {
    var angle = Math.floor(properties.italicAngle * (Math.pow(2, 16)));
    return ('\x00\x03\x00\x00' + // Version number
            string32(angle) + // italicAngle
            '\x00\x00' + // underlinePosition
            '\x00\x00' + // underlineThickness
            string32(properties.fixedPitch) + // isFixedPitch
            '\x00\x00\x00\x00' + // minMemType42
            '\x00\x00\x00\x00' + // maxMemType42
            '\x00\x00\x00\x00' + // minMemType1
            '\x00\x00\x00\x00');  // maxMemType1
  }

  function createNameTable(name, proto) {
    if (!proto) {
      proto = [[], []]; // no strings and unicode strings
    }

    var strings = [
      proto[0][0] || 'Original licence',  // 0.Copyright
      proto[0][1] || name,                // 1.Font family
      proto[0][2] || 'Unknown',           // 2.Font subfamily (font weight)
      proto[0][3] || 'uniqueID',          // 3.Unique ID
      proto[0][4] || name,                // 4.Full font name
      proto[0][5] || 'Version 0.11',      // 5.Version
      proto[0][6] || '',                  // 6.Postscript name
      proto[0][7] || 'Unknown',           // 7.Trademark
      proto[0][8] || 'Unknown',           // 8.Manufacturer
      proto[0][9] || 'Unknown'            // 9.Designer
    ];

    // Mac want 1-byte per character strings while Windows want
    // 2-bytes per character, so duplicate the names table
    var stringsUnicode = [];
    var i, ii, j, jj, str;
    for (i = 0, ii = strings.length; i < ii; i++) {
      str = proto[1][i] || strings[i];

      var strBufUnicode = [];
      for (j = 0, jj = str.length; j < jj; j++) {
        strBufUnicode.push(string16(str.charCodeAt(j)));
      }
      stringsUnicode.push(strBufUnicode.join(''));
    }

    var names = [strings, stringsUnicode];
    var platforms = ['\x00\x01', '\x00\x03'];
    var encodings = ['\x00\x00', '\x00\x01'];
    var languages = ['\x00\x00', '\x04\x09'];

    var namesRecordCount = strings.length * platforms.length;
    var nameTable =
      '\x00\x00' +                           // format
      string16(namesRecordCount) +           // Number of names Record
      string16(namesRecordCount * 12 + 6);   // Storage

    // Build the name records field
    var strOffset = 0;
    for (i = 0, ii = platforms.length; i < ii; i++) {
      var strs = names[i];
      for (j = 0, jj = strs.length; j < jj; j++) {
        str = strs[j];
        var nameRecord =
          platforms[i] + // platform ID
          encodings[i] + // encoding ID
          languages[i] + // language ID
          string16(j) + // name ID
          string16(str.length) +
          string16(strOffset);
        nameTable += nameRecord;
        strOffset += str.length;
      }
    }

    nameTable += strings.join('') + stringsUnicode.join('');
    return nameTable;
  }

  Font.prototype = {
    name: null,
    font: null,
    mimetype: null,
    encoding: null,
    get renderer() {
      var renderer = FontRendererFactory.create(this, SEAC_ANALYSIS_ENABLED);
      return shadow(this, 'renderer', renderer);
    },

    exportData: function Font_exportData() {
      // TODO remove enumerating of the properties, e.g. hardcode exact names.
      var data = {};
      for (var i in this) {
        if (this.hasOwnProperty(i)) {
          data[i] = this[i];
        }
      }
      return data;
    },

    checkAndRepair: function Font_checkAndRepair(name, font, properties) {
      function readTableEntry(file) {
        var tag = bytesToString(file.getBytes(4));

        var checksum = file.getInt32() >>> 0;
        var offset = file.getInt32() >>> 0;
        var length = file.getInt32() >>> 0;

        // Read the table associated data
        var previousPosition = file.pos;
        file.pos = file.start ? file.start : 0;
        file.skip(offset);
        var data = file.getBytes(length);
        file.pos = previousPosition;

        if (tag === 'head') {
          // clearing checksum adjustment
          data[8] = data[9] = data[10] = data[11] = 0;
          data[17] |= 0x20; //Set font optimized for cleartype flag
        }

        return {
          tag: tag,
          checksum: checksum,
          length: length,
          offset: offset,
          data: data
        };
      }

      function readOpenTypeHeader(ttf) {
        return {
          version: bytesToString(ttf.getBytes(4)),
          numTables: ttf.getUint16(),
          searchRange: ttf.getUint16(),
          entrySelector: ttf.getUint16(),
          rangeShift: ttf.getUint16()
        };
      }

      /**
       * Read the appropriate subtable from the cmap according to 9.6.6.4 from
       * PDF spec
       */
      function readCmapTable(cmap, font, isSymbolicFont, hasEncoding) {
        if (!cmap) {
          warn('No cmap table available.');
          return {
            platformId: -1,
            encodingId: -1,
            mappings: [],
            hasShortCmap: false
          };
        }
        var segment;
        var start = (font.start ? font.start : 0) + cmap.offset;
        font.pos = start;

        var version = font.getUint16();
        var numTables = font.getUint16();

        var potentialTable;
        var canBreak = false;
        // There's an order of preference in terms of which cmap subtable to
        // use:
        // - non-symbolic fonts the preference is a 3,1 table then a 1,0 table
        // - symbolic fonts the preference is a 3,0 table then a 1,0 table
        // The following takes advantage of the fact that the tables are sorted
        // to work.
        for (var i = 0; i < numTables; i++) {
          var platformId = font.getUint16();
          var encodingId = font.getUint16();
          var offset = font.getInt32() >>> 0;
          var useTable = false;

          if (platformId === 0 && encodingId === 0) {
            useTable = true;
            // Continue the loop since there still may be a higher priority
            // table.
          } else if (platformId === 1 && encodingId === 0) {
            useTable = true;
            // Continue the loop since there still may be a higher priority
            // table.
          } else if (platformId === 3 && encodingId === 1 &&
                     ((!isSymbolicFont && hasEncoding) || !potentialTable)) {
            useTable = true;
            if (!isSymbolicFont) {
              canBreak = true;
            }
          } else if (isSymbolicFont && platformId === 3 && encodingId === 0) {
            useTable = true;
            canBreak = true;
          }

          if (useTable) {
            potentialTable = {
              platformId: platformId,
              encodingId: encodingId,
              offset: offset
            };
          }
          if (canBreak) {
            break;
          }
        }

        if (potentialTable) {
          font.pos = start + potentialTable.offset;
        }
        if (!potentialTable || font.peekByte() === -1) {
          warn('Could not find a preferred cmap table.');
          return {
            platformId: -1,
            encodingId: -1,
            mappings: [],
            hasShortCmap: false
          };
        }

        var format = font.getUint16();
        var length = font.getUint16();
        var language = font.getUint16();

        var hasShortCmap = false;
        var mappings = [];
        var j, glyphId;

        // TODO(mack): refactor this cmap subtable reading logic out
        if (format === 0) {
          for (j = 0; j < 256; j++) {
            var index = font.getByte();
            if (!index) {
              continue;
            }
            mappings.push({
              charCode: j,
              glyphId: index
            });
          }
          hasShortCmap = true;
        } else if (format === 4) {
          // re-creating the table in format 4 since the encoding
          // might be changed
          var segCount = (font.getUint16() >> 1);
          font.getBytes(6); // skipping range fields
          var segIndex, segments = [];
          for (segIndex = 0; segIndex < segCount; segIndex++) {
            segments.push({ end: font.getUint16() });
          }
          font.getUint16();
          for (segIndex = 0; segIndex < segCount; segIndex++) {
            segments[segIndex].start = font.getUint16();
          }

          for (segIndex = 0; segIndex < segCount; segIndex++) {
            segments[segIndex].delta = font.getUint16();
          }

          var offsetsCount = 0;
          for (segIndex = 0; segIndex < segCount; segIndex++) {
            segment = segments[segIndex];
            var rangeOffset = font.getUint16();
            if (!rangeOffset) {
              segment.offsetIndex = -1;
              continue;
            }

            var offsetIndex = (rangeOffset >> 1) - (segCount - segIndex);
            segment.offsetIndex = offsetIndex;
            offsetsCount = Math.max(offsetsCount, offsetIndex +
                                    segment.end - segment.start + 1);
          }

          var offsets = [];
          for (j = 0; j < offsetsCount; j++) {
            offsets.push(font.getUint16());
          }

          for (segIndex = 0; segIndex < segCount; segIndex++) {
            segment = segments[segIndex];
            start = segment.start;
            var end = segment.end;
            var delta = segment.delta;
            offsetIndex = segment.offsetIndex;

            for (j = start; j <= end; j++) {
              if (j === 0xFFFF) {
                continue;
              }

              glyphId = (offsetIndex < 0 ?
                         j : offsets[offsetIndex + j - start]);
              glyphId = (glyphId + delta) & 0xFFFF;
              if (glyphId === 0) {
                continue;
              }
              mappings.push({
                charCode: j,
                glyphId: glyphId
              });
            }
          }
        } else if (format === 6) {
          // Format 6 is a 2-bytes dense mapping, which means the font data
          // lives glue together even if they are pretty far in the unicode
          // table. (This looks weird, so I can have missed something), this
          // works on Linux but seems to fails on Mac so let's rewrite the
          // cmap table to a 3-1-4 style
          var firstCode = font.getUint16();
          var entryCount = font.getUint16();

          for (j = 0; j < entryCount; j++) {
            glyphId = font.getUint16();
            var charCode = firstCode + j;

            mappings.push({
              charCode: charCode,
              glyphId: glyphId
            });
          }
        } else {
          warn('cmap table has unsupported format: ' + format);
          return {
            platformId: -1,
            encodingId: -1,
            mappings: [],
            hasShortCmap: false
          };
        }

        // removing duplicate entries
        mappings.sort(function (a, b) {
          return a.charCode - b.charCode;
        });
        for (i = 1; i < mappings.length; i++) {
          if (mappings[i - 1].charCode === mappings[i].charCode) {
            mappings.splice(i, 1);
            i--;
          }
        }

        return {
          platformId: potentialTable.platformId,
          encodingId: potentialTable.encodingId,
          mappings: mappings,
          hasShortCmap: hasShortCmap
        };
      }

      function sanitizeMetrics(font, header, metrics, numGlyphs) {
        if (!header) {
          if (metrics) {
            metrics.data = null;
          }
          return;
        }

        font.pos = (font.start ? font.start : 0) + header.offset;
        font.pos += header.length - 2;
        var numOfMetrics = font.getUint16();

        if (numOfMetrics > numGlyphs) {
          info('The numOfMetrics (' + numOfMetrics + ') should not be ' +
               'greater than the numGlyphs (' + numGlyphs + ')');
          // Reduce numOfMetrics if it is greater than numGlyphs
          numOfMetrics = numGlyphs;
          header.data[34] = (numOfMetrics & 0xff00) >> 8;
          header.data[35] = numOfMetrics & 0x00ff;
        }

        var numOfSidebearings = numGlyphs - numOfMetrics;
        var numMissing = numOfSidebearings -
          ((metrics.length - numOfMetrics * 4) >> 1);

        if (numMissing > 0) {
          // For each missing glyph, we set both the width and lsb to 0 (zero).
          // Since we need to add two properties for each glyph, this explains
          // the use of |numMissing * 2| when initializing the typed array.
          var entries = new Uint8Array(metrics.length + numMissing * 2);
          entries.set(metrics.data);
          metrics.data = entries;
        }
      }

      function sanitizeGlyph(source, sourceStart, sourceEnd, dest, destStart,
                             hintsValid) {
        if (sourceEnd - sourceStart <= 12) {
          // glyph with data less than 12 is invalid one
          return 0;
        }
        var glyf = source.subarray(sourceStart, sourceEnd);
        var contoursCount = (glyf[0] << 8) | glyf[1];
        if (contoursCount & 0x8000) {
          // complex glyph, writing as is
          dest.set(glyf, destStart);
          return glyf.length;
        }

        var i, j = 10, flagsCount = 0;
        for (i = 0; i < contoursCount; i++) {
          var endPoint = (glyf[j] << 8) | glyf[j + 1];
          flagsCount = endPoint + 1;
          j += 2;
        }
        // skipping instructions
        var instructionsStart = j;
        var instructionsLength = (glyf[j] << 8) | glyf[j + 1];
        j += 2 + instructionsLength;
        var instructionsEnd = j;
        // validating flags
        var coordinatesLength = 0;
        for (i = 0; i < flagsCount; i++) {
          var flag = glyf[j++];
          if (flag & 0xC0) {
            // reserved flags must be zero, cleaning up
            glyf[j - 1] = flag & 0x3F;
          }
          var xyLength = ((flag & 2) ? 1 : (flag & 16) ? 0 : 2) +
                         ((flag & 4) ? 1 : (flag & 32) ? 0 : 2);
          coordinatesLength += xyLength;
          if (flag & 8) {
            var repeat = glyf[j++];
            i += repeat;
            coordinatesLength += repeat * xyLength;
          }
        }
        // glyph without coordinates will be rejected
        if (coordinatesLength === 0) {
          return 0;
        }
        var glyphDataLength = j + coordinatesLength;
        if (glyphDataLength > glyf.length) {
          // not enough data for coordinates
          return 0;
        }
        if (!hintsValid && instructionsLength > 0) {
          dest.set(glyf.subarray(0, instructionsStart), destStart);
          dest.set([0, 0], destStart + instructionsStart);
          dest.set(glyf.subarray(instructionsEnd, glyphDataLength),
                   destStart + instructionsStart + 2);
          glyphDataLength -= instructionsLength;
          if (glyf.length - glyphDataLength > 3) {
            glyphDataLength = (glyphDataLength + 3) & ~3;
          }
          return glyphDataLength;
        }
        if (glyf.length - glyphDataLength > 3) {
          // truncating and aligning to 4 bytes the long glyph data
          glyphDataLength = (glyphDataLength + 3) & ~3;
          dest.set(glyf.subarray(0, glyphDataLength), destStart);
          return glyphDataLength;
        }
        // glyph data is fine
        dest.set(glyf, destStart);
        return glyf.length;
      }

      function sanitizeHead(head, numGlyphs, locaLength) {
        var data = head.data;

        // Validate version:
        // Should always be 0x00010000
        var version = int32(data[0], data[1], data[2], data[3]);
        if (version >> 16 !== 1) {
          info('Attempting to fix invalid version in head table: ' + version);
          data[0] = 0;
          data[1] = 1;
          data[2] = 0;
          data[3] = 0;
        }

        var indexToLocFormat = int16(data[50], data[51]);
        if (indexToLocFormat < 0 || indexToLocFormat > 1) {
          info('Attempting to fix invalid indexToLocFormat in head table: ' +
               indexToLocFormat);

          // The value of indexToLocFormat should be 0 if the loca table
          // consists of short offsets, and should be 1 if the loca table
          // consists of long offsets.
          //
          // The number of entries in the loca table should be numGlyphs + 1.
          //
          // Using this information, we can work backwards to deduce if the
          // size of each offset in the loca table, and thus figure out the
          // appropriate value for indexToLocFormat.

          var numGlyphsPlusOne = numGlyphs + 1;
          if (locaLength === numGlyphsPlusOne << 1) {
            // 0x0000 indicates the loca table consists of short offsets
            data[50] = 0;
            data[51] = 0;
          } else if (locaLength === numGlyphsPlusOne << 2) {
            // 0x0001 indicates the loca table consists of long offsets
            data[50] = 0;
            data[51] = 1;
          } else {
            warn('Could not fix indexToLocFormat: ' + indexToLocFormat);
          }
        }
      }

      function sanitizeGlyphLocations(loca, glyf, numGlyphs,
                                      isGlyphLocationsLong, hintsValid,
                                      dupFirstEntry) {
        var itemSize, itemDecode, itemEncode;
        if (isGlyphLocationsLong) {
          itemSize = 4;
          itemDecode = function fontItemDecodeLong(data, offset) {
            return (data[offset] << 24) | (data[offset + 1] << 16) |
                   (data[offset + 2] << 8) | data[offset + 3];
          };
          itemEncode = function fontItemEncodeLong(data, offset, value) {
            data[offset] = (value >>> 24) & 0xFF;
            data[offset + 1] = (value >> 16) & 0xFF;
            data[offset + 2] = (value >> 8) & 0xFF;
            data[offset + 3] = value & 0xFF;
          };
        } else {
          itemSize = 2;
          itemDecode = function fontItemDecode(data, offset) {
            return (data[offset] << 9) | (data[offset + 1] << 1);
          };
          itemEncode = function fontItemEncode(data, offset, value) {
            data[offset] = (value >> 9) & 0xFF;
            data[offset + 1] = (value >> 1) & 0xFF;
          };
        }
        var locaData = loca.data;
        var locaDataSize = itemSize * (1 + numGlyphs);
        // is loca.data too short or long?
        if (locaData.length !== locaDataSize) {
          locaData = new Uint8Array(locaDataSize);
          locaData.set(loca.data.subarray(0, locaDataSize));
          loca.data = locaData;
        }
        // removing the invalid glyphs
        var oldGlyfData = glyf.data;
        var oldGlyfDataLength = oldGlyfData.length;
        var newGlyfData = new Uint8Array(oldGlyfDataLength);
        var startOffset = itemDecode(locaData, 0);
        var writeOffset = 0;
        var missingGlyphData = Object.create(null);
        itemEncode(locaData, 0, writeOffset);
        var i, j;
        for (i = 0, j = itemSize; i < numGlyphs; i++, j += itemSize) {
          var endOffset = itemDecode(locaData, j);
          if (endOffset > oldGlyfDataLength &&
              ((oldGlyfDataLength + 3) & ~3) === endOffset) {
            // Aspose breaks fonts by aligning the glyphs to the qword, but not
            // the glyf table size, which makes last glyph out of range.
            endOffset = oldGlyfDataLength;
          }
          if (endOffset > oldGlyfDataLength) {
            // glyph end offset points outside glyf data, rejecting the glyph
            itemEncode(locaData, j, writeOffset);
            startOffset = endOffset;
            continue;
          }

          if (startOffset === endOffset) {
            missingGlyphData[i] = true;
          }

          var newLength = sanitizeGlyph(oldGlyfData, startOffset, endOffset,
                                        newGlyfData, writeOffset, hintsValid);
          writeOffset += newLength;
          itemEncode(locaData, j, writeOffset);
          startOffset = endOffset;
        }

        if (writeOffset === 0) {
          // glyf table cannot be empty -- redoing the glyf and loca tables
          // to have single glyph with one point
          var simpleGlyph = new Uint8Array(
            [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 49, 0]);
          for (i = 0, j = itemSize; i < numGlyphs; i++, j += itemSize) {
            itemEncode(locaData, j, simpleGlyph.length);
          }
          glyf.data = simpleGlyph;
          return missingGlyphData;
        }

        if (dupFirstEntry) {
          var firstEntryLength = itemDecode(locaData, itemSize);
          if (newGlyfData.length > firstEntryLength + writeOffset) {
            glyf.data = newGlyfData.subarray(0, firstEntryLength + writeOffset);
          } else {
            glyf.data = new Uint8Array(firstEntryLength + writeOffset);
            glyf.data.set(newGlyfData.subarray(0, writeOffset));
          }
          glyf.data.set(newGlyfData.subarray(0, firstEntryLength), writeOffset);
          itemEncode(loca.data, locaData.length - itemSize,
                     writeOffset + firstEntryLength);
        } else {
          glyf.data = newGlyfData.subarray(0, writeOffset);
        }
        return missingGlyphData;
      }

      function readPostScriptTable(post, properties, maxpNumGlyphs) {
        var start = (font.start ? font.start : 0) + post.offset;
        font.pos = start;

        var length = post.length, end = start + length;
        var version = font.getInt32();
        // skip rest to the tables
        font.getBytes(28);

        var glyphNames;
        var valid = true;
        var i;

        switch (version) {
          case 0x00010000:
            glyphNames = MacStandardGlyphOrdering;
            break;
          case 0x00020000:
            var numGlyphs = font.getUint16();
            if (numGlyphs !== maxpNumGlyphs) {
              valid = false;
              break;
            }
            var glyphNameIndexes = [];
            for (i = 0; i < numGlyphs; ++i) {
              var index = font.getUint16();
              if (index >= 32768) {
                valid = false;
                break;
              }
              glyphNameIndexes.push(index);
            }
            if (!valid) {
              break;
            }
            var customNames = [];
            var strBuf = [];
            while (font.pos < end) {
              var stringLength = font.getByte();
              strBuf.length = stringLength;
              for (i = 0; i < stringLength; ++i) {
                strBuf[i] = String.fromCharCode(font.getByte());
              }
              customNames.push(strBuf.join(''));
            }
            glyphNames = [];
            for (i = 0; i < numGlyphs; ++i) {
              var j = glyphNameIndexes[i];
              if (j < 258) {
                glyphNames.push(MacStandardGlyphOrdering[j]);
                continue;
              }
              glyphNames.push(customNames[j - 258]);
            }
            break;
          case 0x00030000:
            break;
          default:
            warn('Unknown/unsupported post table version ' + version);
            valid = false;
            if (properties.defaultEncoding) {
              glyphNames = properties.defaultEncoding;
            }
            break;
        }
        properties.glyphNames = glyphNames;
        return valid;
      }

      function readNameTable(nameTable) {
        var start = (font.start ? font.start : 0) + nameTable.offset;
        font.pos = start;

        var names = [[], []];
        var length = nameTable.length, end = start + length;
        var format = font.getUint16();
        var FORMAT_0_HEADER_LENGTH = 6;
        if (format !== 0 || length < FORMAT_0_HEADER_LENGTH) {
          // unsupported name table format or table "too" small
          return names;
        }
        var numRecords = font.getUint16();
        var stringsStart = font.getUint16();
        var records = [];
        var NAME_RECORD_LENGTH = 12;
        var i, ii;

        for (i = 0; i < numRecords &&
                        font.pos + NAME_RECORD_LENGTH <= end; i++) {
          var r = {
            platform: font.getUint16(),
            encoding: font.getUint16(),
            language: font.getUint16(),
            name: font.getUint16(),
            length: font.getUint16(),
            offset: font.getUint16()
          };
          // using only Macintosh and Windows platform/encoding names
          if ((r.platform === 1 && r.encoding === 0 && r.language === 0) ||
              (r.platform === 3 && r.encoding === 1 && r.language === 0x409)) {
            records.push(r);
          }
        }
        for (i = 0, ii = records.length; i < ii; i++) {
          var record = records[i];
          if (record.length <= 0) {
            continue; // Nothing to process, ignoring.
          }
          var pos = start + stringsStart + record.offset;
          if (pos + record.length > end) {
            continue; // outside of name table, ignoring
          }
          font.pos = pos;
          var nameIndex = record.name;
          if (record.encoding) {
            // unicode
            var str = '';
            for (var j = 0, jj = record.length; j < jj; j += 2) {
              str += String.fromCharCode(font.getUint16());
            }
            names[1][nameIndex] = str;
          } else {
            names[0][nameIndex] = bytesToString(font.getBytes(record.length));
          }
        }
        return names;
      }

      var TTOpsStackDeltas = [
        0, 0, 0, 0, 0, 0, 0, 0, -2, -2, -2, -2, 0, 0, -2, -5,
        -1, -1, -1, -1, -1, -1, -1, -1, 0, 0, -1, 0, -1, -1, -1, -1,
        1, -1, -999, 0, 1, 0, -1, -2, 0, -1, -2, -1, -1, 0, -1, -1,
        0, 0, -999, -999, -1, -1, -1, -1, -2, -999, -2, -2, -999, 0, -2, -2,
        0, 0, -2, 0, -2, 0, 0, 0, -2, -1, -1, 1, 1, 0, 0, -1,
        -1, -1, -1, -1, -1, -1, 0, 0, -1, 0, -1, -1, 0, -999, -1, -1,
        -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        -2, -999, -999, -999, -999, -999, -1, -1, -2, -2, 0, 0, 0, 0, -1, -1,
        -999, -2, -2, 0, 0, -1, -2, -2, 0, 0, 0, -1, -1, -1, -2];
        // 0xC0-DF == -1 and 0xE0-FF == -2

      function sanitizeTTProgram(table, ttContext) {
        var data = table.data;
        var i = 0, j, n, b, funcId, pc, lastEndf = 0, lastDeff = 0;
        var stack = [];
        var callstack = [];
        var functionsCalled = [];
        var tooComplexToFollowFunctions =
          ttContext.tooComplexToFollowFunctions;
        var inFDEF = false, ifLevel = 0, inELSE = 0;
        for (var ii = data.length; i < ii;) {
          var op = data[i++];
          // The TrueType instruction set docs can be found at
          // https://developer.apple.com/fonts/TTRefMan/RM05/Chap5.html
          if (op === 0x40) { // NPUSHB - pushes n bytes
            n = data[i++];
            if (inFDEF || inELSE) {
              i += n;
            } else {
              for (j = 0; j < n; j++) {
                stack.push(data[i++]);
              }
            }
          } else if (op === 0x41) { // NPUSHW - pushes n words
            n = data[i++];
            if (inFDEF || inELSE) {
              i += n * 2;
            } else {
              for (j = 0; j < n; j++) {
                b = data[i++];
                stack.push((b << 8) | data[i++]);
              }
            }
          } else if ((op & 0xF8) === 0xB0) { // PUSHB - pushes bytes
            n = op - 0xB0 + 1;
            if (inFDEF || inELSE) {
              i += n;
            } else {
              for (j = 0; j < n; j++) {
                stack.push(data[i++]);
              }
            }
          } else if ((op & 0xF8) === 0xB8) { // PUSHW - pushes words
            n = op - 0xB8 + 1;
            if (inFDEF || inELSE) {
              i += n * 2;
            } else {
              for (j = 0; j < n; j++) {
                b = data[i++];
                stack.push((b << 8) | data[i++]);
              }
            }
          } else if (op === 0x2B && !tooComplexToFollowFunctions) { // CALL
            if (!inFDEF && !inELSE) {
              // collecting inforamtion about which functions are used
              funcId = stack[stack.length - 1];
              ttContext.functionsUsed[funcId] = true;
              if (funcId in ttContext.functionsStackDeltas) {
                stack.length += ttContext.functionsStackDeltas[funcId];
              } else if (funcId in ttContext.functionsDefined &&
                         functionsCalled.indexOf(funcId) < 0) {
                callstack.push({data: data, i: i, stackTop: stack.length - 1});
                functionsCalled.push(funcId);
                pc = ttContext.functionsDefined[funcId];
                if (!pc) {
                  warn('TT: CALL non-existent function');
                  ttContext.hintsValid = false;
                  return;
                }
                data = pc.data;
                i = pc.i;
              }
            }
          } else if (op === 0x2C && !tooComplexToFollowFunctions) { // FDEF
            if (inFDEF || inELSE) {
              warn('TT: nested FDEFs not allowed');
              tooComplexToFollowFunctions = true;
            }
            inFDEF = true;
            // collecting inforamtion about which functions are defined
            lastDeff = i;
            funcId = stack.pop();
            ttContext.functionsDefined[funcId] = {data: data, i: i};
          } else if (op === 0x2D) { // ENDF - end of function
            if (inFDEF) {
              inFDEF = false;
              lastEndf = i;
            } else {
              pc = callstack.pop();
              if (!pc) {
                warn('TT: ENDF bad stack');
                ttContext.hintsValid = false;
                return;
              }
              funcId = functionsCalled.pop();
              data = pc.data;
              i = pc.i;
              ttContext.functionsStackDeltas[funcId] =
                stack.length - pc.stackTop;
            }
          } else if (op === 0x89) { // IDEF - instruction definition
            if (inFDEF || inELSE) {
              warn('TT: nested IDEFs not allowed');
              tooComplexToFollowFunctions = true;
            }
            inFDEF = true;
            // recording it as a function to track ENDF
            lastDeff = i;
          } else if (op === 0x58) { // IF
            ++ifLevel;
          } else if (op === 0x1B) { // ELSE
            inELSE = ifLevel;
          } else if (op === 0x59) { // EIF
            if (inELSE === ifLevel) {
              inELSE = 0;
            }
            --ifLevel;
          } else if (op === 0x1C) { // JMPR
            if (!inFDEF && !inELSE) {
              var offset = stack[stack.length - 1];
              // only jumping forward to prevent infinite loop
              if (offset > 0) {
                i += offset - 1;
              }
            }
          }
          // Adjusting stack not extactly, but just enough to get function id
          if (!inFDEF && !inELSE) {
            var stackDelta = op <= 0x8E ? TTOpsStackDeltas[op] :
              op >= 0xC0 && op <= 0xDF ? -1 : op >= 0xE0 ? -2 : 0;
            if (op >= 0x71 && op <= 0x75) {
              n = stack.pop();
              if (n === n) {
                stackDelta = -n * 2;
              }
            }
            while (stackDelta < 0 && stack.length > 0) {
              stack.pop();
              stackDelta++;
            }
            while (stackDelta > 0) {
              stack.push(NaN); // pushing any number into stack
              stackDelta--;
            }
          }
        }
        ttContext.tooComplexToFollowFunctions = tooComplexToFollowFunctions;
        var content = [data];
        if (i > data.length) {
          content.push(new Uint8Array(i - data.length));
        }
        if (lastDeff > lastEndf) {
          warn('TT: complementing a missing function tail');
          // new function definition started, but not finished
          // complete function by [CLEAR, ENDF]
          content.push(new Uint8Array([0x22, 0x2D]));
        }
        foldTTTable(table, content);
      }

      function checkInvalidFunctions(ttContext, maxFunctionDefs) {
        if (ttContext.tooComplexToFollowFunctions) {
          return;
        }
        if (ttContext.functionsDefined.length > maxFunctionDefs) {
          warn('TT: more functions defined than expected');
          ttContext.hintsValid = false;
          return;
        }
        for (var j = 0, jj = ttContext.functionsUsed.length; j < jj; j++) {
          if (j > maxFunctionDefs) {
            warn('TT: invalid function id: ' + j);
            ttContext.hintsValid = false;
            return;
          }
          if (ttContext.functionsUsed[j] && !ttContext.functionsDefined[j]) {
            warn('TT: undefined function: ' + j);
            ttContext.hintsValid = false;
            return;
          }
        }
      }

      function foldTTTable(table, content) {
        if (content.length > 1) {
          // concatenating the content items
          var newLength = 0;
          var j, jj;
          for (j = 0, jj = content.length; j < jj; j++) {
            newLength += content[j].length;
          }
          newLength = (newLength + 3) & ~3;
          var result = new Uint8Array(newLength);
          var pos = 0;
          for (j = 0, jj = content.length; j < jj; j++) {
            result.set(content[j], pos);
            pos += content[j].length;
          }
          table.data = result;
          table.length = newLength;
        }
      }

      function sanitizeTTPrograms(fpgm, prep, cvt) {
        var ttContext = {
          functionsDefined: [],
          functionsUsed: [],
          functionsStackDeltas: [],
          tooComplexToFollowFunctions: false,
          hintsValid: true
        };
        if (fpgm) {
          sanitizeTTProgram(fpgm, ttContext);
        }
        if (prep) {
          sanitizeTTProgram(prep, ttContext);
        }
        if (fpgm) {
          checkInvalidFunctions(ttContext, maxFunctionDefs);
        }
        if (cvt && (cvt.length & 1)) {
          var cvtData = new Uint8Array(cvt.length + 1);
          cvtData.set(cvt.data);
          cvt.data = cvtData;
        }
        return ttContext.hintsValid;
      }

      // The following steps modify the original font data, making copy
      font = new Stream(new Uint8Array(font.getBytes()));

      var VALID_TABLES = ['OS/2', 'cmap', 'head', 'hhea', 'hmtx', 'maxp',
        'name', 'post', 'loca', 'glyf', 'fpgm', 'prep', 'cvt ', 'CFF '];

      var header = readOpenTypeHeader(font);
      var numTables = header.numTables;
      var cff, cffFile;

      var tables = Object.create(null);
      tables['OS/2'] = null;
      tables['cmap'] = null;
      tables['head'] = null;
      tables['hhea'] = null;
      tables['hmtx'] = null;
      tables['maxp'] = null;
      tables['name'] = null;
      tables['post'] = null;

      var table;
      for (var i = 0; i < numTables; i++) {
        table = readTableEntry(font);
        if (VALID_TABLES.indexOf(table.tag) < 0) {
          continue; // skipping table if it's not a required or optional table
        }
        if (table.length === 0) {
          continue; // skipping empty tables
        }
        tables[table.tag] = table;
      }

      var isTrueType = !tables['CFF '];
      if (!isTrueType) {
        // OpenType font
        if ((header.version === 'OTTO' && properties.type !== 'CIDFontType2') ||
            !tables['head'] || !tables['hhea'] || !tables['maxp'] ||
            !tables['post']) {
          // no major tables: throwing everything at CFFFont
          cffFile = new Stream(tables['CFF '].data);
          cff = new CFFFont(cffFile, properties);

          adjustWidths(properties);

          return this.convert(name, cff, properties);
        }

        delete tables['glyf'];
        delete tables['loca'];
        delete tables['fpgm'];
        delete tables['prep'];
        delete tables['cvt '];
        this.isOpenType = true;
      } else {
        if (!tables['loca']) {
          error('Required "loca" table is not found');
        }
        if (!tables['glyf']) {
          warn('Required "glyf" table is not found -- trying to recover.');
          // Note: We use `sanitizeGlyphLocations` to add dummy glyf data below.
          tables['glyf'] = {
            tag: 'glyf',
            data: new Uint8Array(0),
          };
        }
        this.isOpenType = false;
      }

      if (!tables['maxp']) {
        error('Required "maxp" table is not found');
      }

      font.pos = (font.start || 0) + tables['maxp'].offset;
      var version = font.getInt32();
      var numGlyphs = font.getUint16();
      var maxFunctionDefs = 0;
      if (version >= 0x00010000 && tables['maxp'].length >= 22) {
        // maxZones can be invalid
        font.pos += 8;
        var maxZones = font.getUint16();
        if (maxZones > 2) { // reset to 2 if font has invalid maxZones
          tables['maxp'].data[14] = 0;
          tables['maxp'].data[15] = 2;
        }
        font.pos += 4;
        maxFunctionDefs = font.getUint16();
      }

      var dupFirstEntry = false;
      if (properties.type === 'CIDFontType2' && properties.toUnicode &&
          properties.toUnicode.get(0) > '\u0000') {
        // oracle's defect (see 3427), duplicating first entry
        dupFirstEntry = true;
        numGlyphs++;
        tables['maxp'].data[4] = numGlyphs >> 8;
        tables['maxp'].data[5] = numGlyphs & 255;
      }

      var hintsValid = sanitizeTTPrograms(tables['fpgm'], tables['prep'],
                                          tables['cvt '], maxFunctionDefs);
      if (!hintsValid) {
        delete tables['fpgm'];
        delete tables['prep'];
        delete tables['cvt '];
      }

      // Ensure the hmtx table contains the advance width and
      // sidebearings information for numGlyphs in the maxp table
      sanitizeMetrics(font, tables['hhea'], tables['hmtx'], numGlyphs);

      if (!tables['head']) {
        error('Required "head" table is not found');
      }

      sanitizeHead(tables['head'], numGlyphs,
                   isTrueType ? tables['loca'].length : 0);

      var missingGlyphs = Object.create(null);
      if (isTrueType) {
        var isGlyphLocationsLong = int16(tables['head'].data[50],
                                         tables['head'].data[51]);
        missingGlyphs = sanitizeGlyphLocations(tables['loca'], tables['glyf'],
                                               numGlyphs, isGlyphLocationsLong,
                                               hintsValid, dupFirstEntry);
      }

      if (!tables['hhea']) {
        error('Required "hhea" table is not found');
      }

      // Sanitizer reduces the glyph advanceWidth to the maxAdvanceWidth
      // Sometimes it's 0. That needs to be fixed
      if (tables['hhea'].data[10] === 0 && tables['hhea'].data[11] === 0) {
        tables['hhea'].data[10] = 0xFF;
        tables['hhea'].data[11] = 0xFF;
      }

      // Extract some more font properties from the OpenType head and
      // hhea tables; yMin and descent value are always negative.
      var metricsOverride = {
        unitsPerEm: int16(tables['head'].data[18], tables['head'].data[19]),
        yMax: int16(tables['head'].data[42], tables['head'].data[43]),
        yMin: signedInt16(tables['head'].data[38], tables['head'].data[39]),
        ascent: int16(tables['hhea'].data[4], tables['hhea'].data[5]),
        descent: signedInt16(tables['hhea'].data[6], tables['hhea'].data[7])
      };

      // PDF FontDescriptor metrics lie -- using data from actual font.
      this.ascent = metricsOverride.ascent / metricsOverride.unitsPerEm;
      this.descent = metricsOverride.descent / metricsOverride.unitsPerEm;

      // The 'post' table has glyphs names.
      if (tables['post']) {
        var valid = readPostScriptTable(tables['post'], properties, numGlyphs);
        if (!valid) {
          tables['post'] = null;
        }
      }

      var charCodeToGlyphId = [], charCode;
      var toUnicode = properties.toUnicode, widths = properties.widths;
      var skipToUnicode = (toUnicode instanceof IdentityToUnicodeMap ||
                           toUnicode.length === 0x10000);

      // Helper function to try to skip mapping of empty glyphs.
      // Note: In some cases, just relying on the glyph data doesn't work,
      //       hence we also use a few heuristics to fix various PDF files.
      function hasGlyph(glyphId, charCode, widthCode) {
        if (!missingGlyphs[glyphId]) {
          return true;
        }
        if (!skipToUnicode && charCode >= 0 && toUnicode.has(charCode)) {
          return true;
        }
        if (widths && widthCode >= 0 && isNum(widths[widthCode])) {
          return true;
        }
        return false;
      }

      // Some bad PDF generators, e.g. Scribus PDF, include glyph names
      // in a 'uniXXXX' format -- attempting to recover proper ones.
      function recoverGlyphName(name, glyphsUnicodeMap) {
        if (glyphsUnicodeMap[name] !== undefined) {
          return name;
        }
        // The glyph name is non-standard, trying to recover.
        var unicode = getUnicodeForGlyph(name, glyphsUnicodeMap);
        if (unicode !== -1) {
          for (var key in glyphsUnicodeMap) {
            if (glyphsUnicodeMap[key] === unicode) {
              return key;
            }
          }
        }
        warn('Unable to recover a standard glyph name for: ' + name);
        return name;
      }


      if (properties.type === 'CIDFontType2') {
        var cidToGidMap = properties.cidToGidMap || [];
        var isCidToGidMapEmpty = cidToGidMap.length === 0;

        properties.cMap.forEach(function(charCode, cid) {
          assert(cid <= 0xffff, 'Max size of CID is 65,535');
          var glyphId = -1;
          if (isCidToGidMapEmpty) {
            glyphId = cid;
          } else if (cidToGidMap[cid] !== undefined) {
            glyphId = cidToGidMap[cid];
          }

          if (glyphId >= 0 && glyphId < numGlyphs &&
              hasGlyph(glyphId, charCode, cid)) {
            charCodeToGlyphId[charCode] = glyphId;
          }
        });
        if (dupFirstEntry) {
          charCodeToGlyphId[0] = numGlyphs - 1;
        }
      } else {
        // Most of the following logic in this code branch is based on the
        // 9.6.6.4 of the PDF spec.
        var hasEncoding =
          properties.differences.length > 0 || !!properties.baseEncodingName;
        var cmapTable =
          readCmapTable(tables['cmap'], font, this.isSymbolicFont, hasEncoding);
        var cmapPlatformId = cmapTable.platformId;
        var cmapEncodingId = cmapTable.encodingId;
        var cmapMappings = cmapTable.mappings;
        var cmapMappingsLength = cmapMappings.length;

        // The spec seems to imply that if the font is symbolic the encoding
        // should be ignored, this doesn't appear to work for 'preistabelle.pdf'
        // where the the font is symbolic and it has an encoding.
        if (hasEncoding &&
            (cmapPlatformId === 3 && cmapEncodingId === 1 ||
             cmapPlatformId === 1 && cmapEncodingId === 0) ||
            (cmapPlatformId === -1 && cmapEncodingId === -1 && // Temporary hack
             !!getEncoding(properties.baseEncodingName))) {    // Temporary hack
          // When no preferred cmap table was found and |baseEncodingName| is
          // one of the predefined encodings, we seem to obtain a better
          // |charCodeToGlyphId| map from the code below (fixes bug 1057544).
          // TODO: Note that this is a hack which should be removed as soon as
          //       we have proper support for more exotic cmap tables.

          var baseEncoding = [];
          if (properties.baseEncodingName === 'MacRomanEncoding' ||
              properties.baseEncodingName === 'WinAnsiEncoding') {
            baseEncoding = getEncoding(properties.baseEncodingName);
          }
          var glyphsUnicodeMap = getGlyphsUnicode();
          for (charCode = 0; charCode < 256; charCode++) {
            var glyphName, standardGlyphName;
            if (this.differences && charCode in this.differences) {
              glyphName = this.differences[charCode];
            } else if (charCode in baseEncoding &&
                       baseEncoding[charCode] !== '') {
              glyphName = baseEncoding[charCode];
            } else {
              glyphName = StandardEncoding[charCode];
            }
            if (!glyphName) {
              continue;
            }
            // Ensure that non-standard glyph names are resolved to valid ones.
            standardGlyphName = recoverGlyphName(glyphName, glyphsUnicodeMap);

            var unicodeOrCharCode, isUnicode = false;
            if (cmapPlatformId === 3 && cmapEncodingId === 1) {
              unicodeOrCharCode = glyphsUnicodeMap[standardGlyphName];
              isUnicode = true;
            } else if (cmapPlatformId === 1 && cmapEncodingId === 0) {
              // TODO: the encoding needs to be updated with mac os table.
              unicodeOrCharCode = MacRomanEncoding.indexOf(standardGlyphName);
            }

            var found = false;
            for (i = 0; i < cmapMappingsLength; ++i) {
              if (cmapMappings[i].charCode !== unicodeOrCharCode) {
                continue;
              }
              var code = isUnicode ? charCode : unicodeOrCharCode;
              if (hasGlyph(cmapMappings[i].glyphId, code, -1)) {
                charCodeToGlyphId[charCode] = cmapMappings[i].glyphId;
                found = true;
                break;
              }
            }
            if (!found && properties.glyphNames) {
              // Try to map using the post table.
              var glyphId = properties.glyphNames.indexOf(glyphName);
              // The post table ought to use the same kind of glyph names as the
              // `differences` array, but check the standard ones as a fallback.
              if (glyphId === -1 && standardGlyphName !== glyphName) {
                glyphId = properties.glyphNames.indexOf(standardGlyphName);
              }
              if (glyphId > 0 && hasGlyph(glyphId, -1, -1)) {
                charCodeToGlyphId[charCode] = glyphId;
                found = true;
              }
            }
            if (!found) {
              charCodeToGlyphId[charCode] = 0; // notdef
            }
          }
        } else if (cmapPlatformId === 0 && cmapEncodingId === 0) {
          // Default Unicode semantics, use the charcodes as is.
          for (i = 0; i < cmapMappingsLength; ++i) {
            charCodeToGlyphId[cmapMappings[i].charCode] =
              cmapMappings[i].glyphId;
          }
        } else {
          // For (3, 0) cmap tables:
          // The charcode key being stored in charCodeToGlyphId is the lower
          // byte of the two-byte charcodes of the cmap table since according to
          // the spec: 'each byte from the string shall be prepended with the
          // high byte of the range [of charcodes in the cmap table], to form
          // a two-byte character, which shall be used to select the
          // associated glyph description from the subtable'.
          //
          // For (1, 0) cmap tables:
          // 'single bytes from the string shall be used to look up the
          // associated glyph descriptions from the subtable'. This means
          // charcodes in the cmap will be single bytes, so no-op since
          // glyph.charCode & 0xFF === glyph.charCode
          for (i = 0; i < cmapMappingsLength; ++i) {
            charCode = cmapMappings[i].charCode & 0xFF;
            charCodeToGlyphId[charCode] = cmapMappings[i].glyphId;
          }
        }
      }

      if (charCodeToGlyphId.length === 0) {
        // defines at least one glyph
        charCodeToGlyphId[0] = 0;
      }

      // Converting glyphs and ids into font's cmap table
      var newMapping = adjustMapping(charCodeToGlyphId, properties);
      this.toFontChar = newMapping.toFontChar;
      tables['cmap'] = {
        tag: 'cmap',
        data: createCmapTable(newMapping.charCodeToGlyphId, numGlyphs)
      };

      if (!tables['OS/2'] || !validateOS2Table(tables['OS/2'])) {
        tables['OS/2'] = {
          tag: 'OS/2',
          data: createOS2Table(properties, newMapping.charCodeToGlyphId,
                               metricsOverride)
        };
      }

      // Rewrite the 'post' table if needed
      if (!tables['post']) {
        tables['post'] = {
          tag: 'post',
          data: createPostTable(properties)
        };
      }

      if (!isTrueType) {
        try {
          // Trying to repair CFF file
          cffFile = new Stream(tables['CFF '].data);
          var parser = new CFFParser(cffFile, properties,
                                     SEAC_ANALYSIS_ENABLED);
          cff = parser.parse();
          var compiler = new CFFCompiler(cff);
          tables['CFF '].data = compiler.compile();
        } catch (e) {
          warn('Failed to compile font ' + properties.loadedName);
        }
      }

      // Re-creating 'name' table
      if (!tables['name']) {
        tables['name'] = {
          tag: 'name',
          data: createNameTable(this.name)
        };
      } else {
        // ... using existing 'name' table as prototype
        var namePrototype = readNameTable(tables['name']);
        tables['name'].data = createNameTable(name, namePrototype);
      }

      var builder = new OpenTypeFileBuilder(header.version);
      for (var tableTag in tables) {
        builder.addTable(tableTag, tables[tableTag].data);
      }
      return builder.toArray();
    },

    convert: function Font_convert(fontName, font, properties) {
      // TODO: Check the charstring widths to determine this.
      properties.fixedPitch = false;

      var mapping = font.getGlyphMapping(properties);
      var newMapping = adjustMapping(mapping, properties);
      this.toFontChar = newMapping.toFontChar;
      var numGlyphs = font.numGlyphs;

      function getCharCodes(charCodeToGlyphId, glyphId) {
        var charCodes = null;
        for (var charCode in charCodeToGlyphId) {
          if (glyphId === charCodeToGlyphId[charCode]) {
            if (!charCodes) {
              charCodes = [];
            }
            charCodes.push(charCode | 0);
          }
        }
        return charCodes;
      }

      function createCharCode(charCodeToGlyphId, glyphId) {
        for (var charCode in charCodeToGlyphId) {
          if (glyphId === charCodeToGlyphId[charCode]) {
            return charCode | 0;
          }
        }
        newMapping.charCodeToGlyphId[newMapping.nextAvailableFontCharCode] =
            glyphId;
        return newMapping.nextAvailableFontCharCode++;
      }

      var seacs = font.seacs;
      if (SEAC_ANALYSIS_ENABLED && seacs && seacs.length) {
        var matrix = properties.fontMatrix || FONT_IDENTITY_MATRIX;
        var charset = font.getCharset();
        var seacMap = Object.create(null);
        for (var glyphId in seacs) {
          glyphId |= 0;
          var seac = seacs[glyphId];
          var baseGlyphName = StandardEncoding[seac[2]];
          var accentGlyphName = StandardEncoding[seac[3]];
          var baseGlyphId = charset.indexOf(baseGlyphName);
          var accentGlyphId = charset.indexOf(accentGlyphName);
          if (baseGlyphId < 0 || accentGlyphId < 0) {
            continue;
          }
          var accentOffset = {
            x: seac[0] * matrix[0] + seac[1] * matrix[2] + matrix[4],
            y: seac[0] * matrix[1] + seac[1] * matrix[3] + matrix[5]
          };

          var charCodes = getCharCodes(mapping, glyphId);
          if (!charCodes) {
            // There's no point in mapping it if the char code was never mapped
            // to begin with.
            continue;
          }
          for (var i = 0, ii = charCodes.length; i < ii; i++) {
            var charCode = charCodes[i];
            // Find a fontCharCode that maps to the base and accent glyphs.
            // If one doesn't exists, create it.
            var charCodeToGlyphId = newMapping.charCodeToGlyphId;
            var baseFontCharCode = createCharCode(charCodeToGlyphId,
                                                  baseGlyphId);
            var accentFontCharCode = createCharCode(charCodeToGlyphId,
                                                    accentGlyphId);
            seacMap[charCode] = {
              baseFontCharCode: baseFontCharCode,
              accentFontCharCode: accentFontCharCode,
              accentOffset: accentOffset
            };
          }
        }
        properties.seacMap = seacMap;
      }

      var unitsPerEm = 1 / (properties.fontMatrix || FONT_IDENTITY_MATRIX)[0];

      var builder = new OpenTypeFileBuilder('\x4F\x54\x54\x4F');
      // PostScript Font Program
      builder.addTable('CFF ', font.data);
      // OS/2 and Windows Specific metrics
      builder.addTable('OS/2', createOS2Table(properties,
                                              newMapping.charCodeToGlyphId));
      // Character to glyphs mapping
      builder.addTable('cmap', createCmapTable(newMapping.charCodeToGlyphId,
                       numGlyphs));
      // Font header
      builder.addTable('head',
            '\x00\x01\x00\x00' + // Version number
            '\x00\x00\x10\x00' + // fontRevision
            '\x00\x00\x00\x00' + // checksumAdjustement
            '\x5F\x0F\x3C\xF5' + // magicNumber
            '\x00\x00' + // Flags
            safeString16(unitsPerEm) + // unitsPerEM
            '\x00\x00\x00\x00\x9e\x0b\x7e\x27' + // creation date
            '\x00\x00\x00\x00\x9e\x0b\x7e\x27' + // modifification date
            '\x00\x00' + // xMin
            safeString16(properties.descent) + // yMin
            '\x0F\xFF' + // xMax
            safeString16(properties.ascent) + // yMax
            string16(properties.italicAngle ? 2 : 0) + // macStyle
            '\x00\x11' + // lowestRecPPEM
            '\x00\x00' + // fontDirectionHint
            '\x00\x00' + // indexToLocFormat
            '\x00\x00');  // glyphDataFormat

      // Horizontal header
      builder.addTable('hhea',
            '\x00\x01\x00\x00' + // Version number
            safeString16(properties.ascent) + // Typographic Ascent
            safeString16(properties.descent) + // Typographic Descent
            '\x00\x00' + // Line Gap
            '\xFF\xFF' + // advanceWidthMax
            '\x00\x00' + // minLeftSidebearing
            '\x00\x00' + // minRightSidebearing
            '\x00\x00' + // xMaxExtent
            safeString16(properties.capHeight) + // caretSlopeRise
            safeString16(Math.tan(properties.italicAngle) *
                         properties.xHeight) + // caretSlopeRun
            '\x00\x00' + // caretOffset
            '\x00\x00' + // -reserved-
            '\x00\x00' + // -reserved-
            '\x00\x00' + // -reserved-
            '\x00\x00' + // -reserved-
            '\x00\x00' + // metricDataFormat
            string16(numGlyphs)); // Number of HMetrics

      // Horizontal metrics
      builder.addTable('hmtx', (function fontFieldsHmtx() {
          var charstrings = font.charstrings;
          var cffWidths = font.cff ? font.cff.widths : null;
          var hmtx = '\x00\x00\x00\x00'; // Fake .notdef
          for (var i = 1, ii = numGlyphs; i < ii; i++) {
            var width = 0;
            if (charstrings) {
              var charstring = charstrings[i - 1];
              width = 'width' in charstring ? charstring.width : 0;
            } else if (cffWidths) {
              width = Math.ceil(cffWidths[i] || 0);
            }
            hmtx += string16(width) + string16(0);
          }
          return hmtx;
        })());

      // Maximum profile
      builder.addTable('maxp',
            '\x00\x00\x50\x00' + // Version number
            string16(numGlyphs)); // Num of glyphs

      // Naming tables
      builder.addTable('name', createNameTable(fontName));

      // PostScript informations
      builder.addTable('post', createPostTable(properties));

      return builder.toArray();
    },

    get spaceWidth() {
      if ('_shadowWidth' in this) {
        return this._shadowWidth;
      }

      // trying to estimate space character width
      var possibleSpaceReplacements = ['space', 'minus', 'one', 'i'];
      var width;
      for (var i = 0, ii = possibleSpaceReplacements.length; i < ii; i++) {
        var glyphName = possibleSpaceReplacements[i];
        // if possible, getting width by glyph name
        if (glyphName in this.widths) {
          width = this.widths[glyphName];
          break;
        }
        var glyphsUnicodeMap = getGlyphsUnicode();
        var glyphUnicode = glyphsUnicodeMap[glyphName];
        // finding the charcode via unicodeToCID map
        var charcode = 0;
        if (this.composite) {
          if (this.cMap.contains(glyphUnicode)) {
            charcode = this.cMap.lookup(glyphUnicode);
          }
        }
        // ... via toUnicode map
        if (!charcode && this.toUnicode) {
          charcode = this.toUnicode.charCodeOf(glyphUnicode);
        }
        // setting it to unicode if negative or undefined
        if (charcode <= 0) {
          charcode = glyphUnicode;
        }
        // trying to get width via charcode
        width = this.widths[charcode];
        if (width) {
          break; // the non-zero width found
        }
      }
      width = width || this.defaultWidth;
      // Do not shadow the property here. See discussion:
      // https://github.com/mozilla/pdf.js/pull/2127#discussion_r1662280
      this._shadowWidth = width;
      return width;
    },

    charToGlyph: function Font_charToGlyph(charcode, isSpace) {
      var fontCharCode, width, operatorListId;

      var widthCode = charcode;
      if (this.cMap && this.cMap.contains(charcode)) {
        widthCode = this.cMap.lookup(charcode);
      }
      width = this.widths[widthCode];
      width = isNum(width) ? width : this.defaultWidth;
      var vmetric = this.vmetrics && this.vmetrics[widthCode];

      var unicode = this.toUnicode.get(charcode) || charcode;
      if (typeof unicode === 'number') {
        unicode = String.fromCharCode(unicode);
      }

      var isInFont = charcode in this.toFontChar;
      // First try the toFontChar map, if it's not there then try falling
      // back to the char code.
      fontCharCode = this.toFontChar[charcode] || charcode;
      if (this.missingFile) {
        fontCharCode = mapSpecialUnicodeValues(fontCharCode);
      }

      if (this.isType3Font) {
        // Font char code in this case is actually a glyph name.
        operatorListId = fontCharCode;
      }

      var accent = null;
      if (this.seacMap && this.seacMap[charcode]) {
        isInFont = true;
        var seac = this.seacMap[charcode];
        fontCharCode = seac.baseFontCharCode;
        accent = {
          fontChar: String.fromCharCode(seac.accentFontCharCode),
          offset: seac.accentOffset
        };
      }

      var fontChar = String.fromCharCode(fontCharCode);

      var glyph = this.glyphCache[charcode];
      if (!glyph ||
          !glyph.matchesForCache(fontChar, unicode, accent, width, vmetric,
                                 operatorListId, isSpace, isInFont)) {
        glyph = new Glyph(fontChar, unicode, accent, width, vmetric,
                          operatorListId, isSpace, isInFont);
        this.glyphCache[charcode] = glyph;
      }
      return glyph;
    },

    charsToGlyphs: function Font_charsToGlyphs(chars) {
      var charsCache = this.charsCache;
      var glyphs, glyph, charcode;

      // if we translated this string before, just grab it from the cache
      if (charsCache) {
        glyphs = charsCache[chars];
        if (glyphs) {
          return glyphs;
        }
      }

      // lazily create the translation cache
      if (!charsCache) {
        charsCache = this.charsCache = Object.create(null);
      }

      glyphs = [];
      var charsCacheKey = chars;
      var i = 0, ii;

      if (this.cMap) {
        // composite fonts have multi-byte strings convert the string from
        // single-byte to multi-byte
        var c = Object.create(null);
        while (i < chars.length) {
          this.cMap.readCharCode(chars, i, c);
          charcode = c.charcode;
          var length = c.length;
          i += length;
          // Space is char with code 0x20 and length 1 in multiple-byte codes.
          var isSpace = length === 1 && chars.charCodeAt(i - 1) === 0x20;
          glyph = this.charToGlyph(charcode, isSpace);
          glyphs.push(glyph);
        }
      } else {
        for (i = 0, ii = chars.length; i < ii; ++i) {
          charcode = chars.charCodeAt(i);
          glyph = this.charToGlyph(charcode, charcode === 0x20);
          glyphs.push(glyph);
        }
      }

      // Enter the translated string into the cache
      return (charsCache[charsCacheKey] = glyphs);
    }
  };

  return Font;
})();

var ErrorFont = (function ErrorFontClosure() {
  function ErrorFont(error) {
    this.error = error;
    this.loadedName = 'g_font_error';
    this.loading = false;
  }

  ErrorFont.prototype = {
    charsToGlyphs: function ErrorFont_charsToGlyphs() {
      return [];
    },
    exportData: function ErrorFont_exportData() {
      return {error: this.error};
    }
  };

  return ErrorFont;
})();

/**
 * Shared logic for building a char code to glyph id mapping for Type1 and
 * simple CFF fonts. See section 9.6.6.2 of the spec.
 * @param {Object} properties Font properties object.
 * @param {Object} builtInEncoding The encoding contained within the actual font
 * data.
 * @param {Array} Array of glyph names where the index is the glyph ID.
 * @returns {Object} A char code to glyph ID map.
 */
function type1FontGlyphMapping(properties, builtInEncoding, glyphNames) {
  var charCodeToGlyphId = Object.create(null);
  var glyphId, charCode, baseEncoding;

  if (properties.baseEncodingName) {
    // If a valid base encoding name was used, the mapping is initialized with
    // that.
    baseEncoding = getEncoding(properties.baseEncodingName);
    for (charCode = 0; charCode < baseEncoding.length; charCode++) {
      glyphId = glyphNames.indexOf(baseEncoding[charCode]);
      if (glyphId >= 0) {
        charCodeToGlyphId[charCode] = glyphId;
      } else {
        charCodeToGlyphId[charCode] = 0; // notdef
      }
    }
  } else if (!!(properties.flags & FontFlags.Symbolic)) {
    // For a symbolic font the encoding should be the fonts built-in
    // encoding.
    for (charCode in builtInEncoding) {
      charCodeToGlyphId[charCode] = builtInEncoding[charCode];
    }
  } else {
    // For non-symbolic fonts that don't have a base encoding the standard
    // encoding should be used.
    baseEncoding = StandardEncoding;
    for (charCode = 0; charCode < baseEncoding.length; charCode++) {
      glyphId = glyphNames.indexOf(baseEncoding[charCode]);
      if (glyphId >= 0) {
        charCodeToGlyphId[charCode] = glyphId;
      } else {
        charCodeToGlyphId[charCode] = 0; // notdef
      }
    }
  }

  // Lastly, merge in the differences.
  var differences = properties.differences;
  if (differences) {
    for (charCode in differences) {
      var glyphName = differences[charCode];
      glyphId = glyphNames.indexOf(glyphName);
      if (glyphId >= 0) {
        charCodeToGlyphId[charCode] = glyphId;
      } else {
        charCodeToGlyphId[charCode] = 0; // notdef
      }
    }
  }
  return charCodeToGlyphId;
}

// Type1Font is also a CIDFontType0.
var Type1Font = (function Type1FontClosure() {
  function findBlock(streamBytes, signature, startIndex) {
    var streamBytesLength = streamBytes.length;
    var signatureLength = signature.length;
    var scanLength = streamBytesLength - signatureLength;

    var i = startIndex, j, found = false;
    while (i < scanLength) {
      j = 0;
      while (j < signatureLength && streamBytes[i + j] === signature[j]) {
        j++;
      }
      if (j >= signatureLength) { // `signature` found, skip over whitespace.
        i += j;
        while (i < streamBytesLength && Lexer.isSpace(streamBytes[i])) {
          i++;
        }
        found = true;
        break;
      }
      i++;
    }
    return {
      found: found,
      length: i,
    };
  }

  function getHeaderBlock(stream, suggestedLength) {
    var EEXEC_SIGNATURE = [0x65, 0x65, 0x78, 0x65, 0x63];

    var streamStartPos = stream.pos; // Save the initial stream position.
    var headerBytes, headerBytesLength, block;
    try {
      headerBytes = stream.getBytes(suggestedLength);
      headerBytesLength = headerBytes.length;
    } catch (ex) {
      if (ex instanceof MissingDataException) {
        throw ex;
      }
      // Ignore errors if the `suggestedLength` is huge enough that a Uint8Array
      // cannot hold the result of `getBytes`, and fallback to simply checking
      // the entire stream (fixes issue3928.pdf).
    }

    if (headerBytesLength === suggestedLength) {
      // Most of the time `suggestedLength` is correct, so to speed things up we
      // initially only check the last few bytes to see if the header was found.
      // Otherwise we (potentially) check the entire stream to prevent errors in
      // `Type1Parser` (fixes issue5686.pdf).
      block = findBlock(headerBytes, EEXEC_SIGNATURE,
                        suggestedLength - 2 * EEXEC_SIGNATURE.length);

      if (block.found && block.length === suggestedLength) {
        return {
          stream: new Stream(headerBytes),
          length: suggestedLength,
        };
      }
    }
    warn('Invalid "Length1" property in Type1 font -- trying to recover.');
    stream.pos = streamStartPos; // Reset the stream position.

    var SCAN_BLOCK_LENGTH = 2048;
    var actualLength;
    while (true) {
      var scanBytes = stream.peekBytes(SCAN_BLOCK_LENGTH);
      block = findBlock(scanBytes, EEXEC_SIGNATURE, 0);

      if (block.length === 0) {
        break;
      }
      stream.pos += block.length; // Update the stream position.

      if (block.found) {
        actualLength = stream.pos - streamStartPos;
        break;
      }
    }
    stream.pos = streamStartPos; // Reset the stream position.

    if (actualLength) {
      return {
        stream: new Stream(stream.getBytes(actualLength)),
        length: actualLength,
      };
    }
    warn('Unable to recover "Length1" property in Type1 font -- using as is.');
    return {
      stream: new Stream(stream.getBytes(suggestedLength)),
      length: suggestedLength,
    };
  }

  function getEexecBlock(stream, suggestedLength) {
    // We should ideally parse the eexec block to ensure that `suggestedLength`
    // is correct, so we don't truncate the block data if it's too small.
    // However, this would also require checking if the fixed-content portion
    // exists (using the 'Length3' property), and ensuring that it's valid.
    //
    // Given that `suggestedLength` almost always is correct, all the validation
    // would require a great deal of unnecessary parsing for most fonts.
    // To save time, we always fetch the entire stream instead, which also avoid
    // issues if `suggestedLength` is huge (see comment in `getHeaderBlock`).
    //
    // NOTE: This means that the function can include the fixed-content portion
    // in the returned eexec block. In practice this does *not* seem to matter,
    // since `Type1Parser_extractFontProgram` will skip over any non-commands.
    var eexecBytes = stream.getBytes();
    return {
      stream: new Stream(eexecBytes),
      length: eexecBytes.length,
    };
  }

  function Type1Font(name, file, properties) {
    // Some bad generators embed pfb file as is, we have to strip 6-byte header.
    // Also, length1 and length2 might be off by 6 bytes as well.
    // http://www.math.ubc.ca/~cass/piscript/type1.pdf
    var PFB_HEADER_SIZE = 6;
    var headerBlockLength = properties.length1;
    var eexecBlockLength = properties.length2;
    var pfbHeader = file.peekBytes(PFB_HEADER_SIZE);
    var pfbHeaderPresent = pfbHeader[0] === 0x80 && pfbHeader[1] === 0x01;
    if (pfbHeaderPresent) {
      file.skip(PFB_HEADER_SIZE);
      headerBlockLength = (pfbHeader[5] << 24) | (pfbHeader[4] << 16) |
                          (pfbHeader[3] << 8) | pfbHeader[2];
    }

    // Get the data block containing glyphs and subrs informations
    var headerBlock = getHeaderBlock(file, headerBlockLength);
    headerBlockLength = headerBlock.length;
    var headerBlockParser = new Type1Parser(headerBlock.stream, false,
                                            SEAC_ANALYSIS_ENABLED);
    headerBlockParser.extractFontHeader(properties);

    if (pfbHeaderPresent) {
      pfbHeader = file.getBytes(PFB_HEADER_SIZE);
      eexecBlockLength = (pfbHeader[5] << 24) | (pfbHeader[4] << 16) |
                         (pfbHeader[3] << 8) | pfbHeader[2];
    }

    // Decrypt the data blocks and retrieve it's content
    var eexecBlock = getEexecBlock(file, eexecBlockLength);
    eexecBlockLength = eexecBlock.length;
    var eexecBlockParser = new Type1Parser(eexecBlock.stream, true,
                                           SEAC_ANALYSIS_ENABLED);
    var data = eexecBlockParser.extractFontProgram();
    for (var info in data.properties) {
      properties[info] = data.properties[info];
    }

    var charstrings = data.charstrings;
    var type2Charstrings = this.getType2Charstrings(charstrings);
    var subrs = this.getType2Subrs(data.subrs);

    this.charstrings = charstrings;
    this.data = this.wrap(name, type2Charstrings, this.charstrings,
                          subrs, properties);
    this.seacs = this.getSeacs(data.charstrings);
  }

  Type1Font.prototype = {
    get numGlyphs() {
      return this.charstrings.length + 1;
    },

    getCharset: function Type1Font_getCharset() {
      var charset = ['.notdef'];
      var charstrings = this.charstrings;
      for (var glyphId = 0; glyphId < charstrings.length; glyphId++) {
        charset.push(charstrings[glyphId].glyphName);
      }
      return charset;
    },

    getGlyphMapping: function Type1Font_getGlyphMapping(properties) {
      var charstrings = this.charstrings;
      var glyphNames = ['.notdef'], glyphId;
      for (glyphId = 0; glyphId < charstrings.length; glyphId++) {
        glyphNames.push(charstrings[glyphId].glyphName);
      }
      var encoding = properties.builtInEncoding;
      if (encoding) {
        var builtInEncoding = Object.create(null);
        for (var charCode in encoding) {
          glyphId = glyphNames.indexOf(encoding[charCode]);
          if (glyphId >= 0) {
            builtInEncoding[charCode] = glyphId;
          }
        }
      }

      return type1FontGlyphMapping(properties, builtInEncoding, glyphNames);
    },

    getSeacs: function Type1Font_getSeacs(charstrings) {
      var i, ii;
      var seacMap = [];
      for (i = 0, ii = charstrings.length; i < ii; i++) {
        var charstring = charstrings[i];
        if (charstring.seac) {
          // Offset by 1 for .notdef
          seacMap[i + 1] = charstring.seac;
        }
      }
      return seacMap;
    },

    getType2Charstrings: function Type1Font_getType2Charstrings(
                                    type1Charstrings) {
      var type2Charstrings = [];
      for (var i = 0, ii = type1Charstrings.length; i < ii; i++) {
        type2Charstrings.push(type1Charstrings[i].charstring);
      }
      return type2Charstrings;
    },

    getType2Subrs: function Type1Font_getType2Subrs(type1Subrs) {
      var bias = 0;
      var count = type1Subrs.length;
      if (count < 1133) {
        bias = 107;
      } else if (count < 33769) {
        bias = 1131;
      } else {
        bias = 32768;
      }

      // Add a bunch of empty subrs to deal with the Type2 bias
      var type2Subrs = [];
      var i;
      for (i = 0; i < bias; i++) {
        type2Subrs.push([0x0B]);
      }

      for (i = 0; i < count; i++) {
        type2Subrs.push(type1Subrs[i]);
      }

      return type2Subrs;
    },

    wrap: function Type1Font_wrap(name, glyphs, charstrings, subrs,
                                  properties) {
      var cff = new CFF();
      cff.header = new CFFHeader(1, 0, 4, 4);

      cff.names = [name];

      var topDict = new CFFTopDict();
      // CFF strings IDs 0...390 are predefined names, so refering
      // to entries in our own String INDEX starts at SID 391.
      topDict.setByName('version', 391);
      topDict.setByName('Notice', 392);
      topDict.setByName('FullName', 393);
      topDict.setByName('FamilyName', 394);
      topDict.setByName('Weight', 395);
      topDict.setByName('Encoding', null); // placeholder
      topDict.setByName('FontMatrix', properties.fontMatrix);
      topDict.setByName('FontBBox', properties.bbox);
      topDict.setByName('charset', null); // placeholder
      topDict.setByName('CharStrings', null); // placeholder
      topDict.setByName('Private', null); // placeholder
      cff.topDict = topDict;

      var strings = new CFFStrings();
      strings.add('Version 0.11'); // Version
      strings.add('See original notice'); // Notice
      strings.add(name); // FullName
      strings.add(name); // FamilyName
      strings.add('Medium'); // Weight
      cff.strings = strings;

      cff.globalSubrIndex = new CFFIndex();

      var count = glyphs.length;
      var charsetArray = [0];
      var i, ii;
      for (i = 0; i < count; i++) {
        var index = CFFStandardStrings.indexOf(charstrings[i].glyphName);
        // TODO: Insert the string and correctly map it.  Previously it was
        // thought mapping names that aren't in the standard strings to .notdef
        // was fine, however in issue818 when mapping them all to .notdef the
        // adieresis glyph no longer worked.
        if (index === -1) {
          index = 0;
        }
        charsetArray.push((index >> 8) & 0xff, index & 0xff);
      }
      cff.charset = new CFFCharset(false, 0, [], charsetArray);

      var charStringsIndex = new CFFIndex();
      charStringsIndex.add([0x8B, 0x0E]); // .notdef
      for (i = 0; i < count; i++) {
        charStringsIndex.add(glyphs[i]);
      }
      cff.charStrings = charStringsIndex;

      var privateDict = new CFFPrivateDict();
      privateDict.setByName('Subrs', null); // placeholder
      var fields = [
        'BlueValues',
        'OtherBlues',
        'FamilyBlues',
        'FamilyOtherBlues',
        'StemSnapH',
        'StemSnapV',
        'BlueShift',
        'BlueFuzz',
        'BlueScale',
        'LanguageGroup',
        'ExpansionFactor',
        'ForceBold',
        'StdHW',
        'StdVW'
      ];
      for (i = 0, ii = fields.length; i < ii; i++) {
        var field = fields[i];
        if (!(field in properties.privateData)) {
          continue;
        }
        var value = properties.privateData[field];
        if (isArray(value)) {
          // All of the private dictionary array data in CFF must be stored as
          // "delta-encoded" numbers.
          for (var j = value.length - 1; j > 0; j--) {
            value[j] -= value[j - 1]; // ... difference from previous value
          }
        }
        privateDict.setByName(field, value);
      }
      cff.topDict.privateDict = privateDict;

      var subrIndex = new CFFIndex();
      for (i = 0, ii = subrs.length; i < ii; i++) {
        subrIndex.add(subrs[i]);
      }
      privateDict.subrsIndex = subrIndex;

      var compiler = new CFFCompiler(cff);
      return compiler.compile();
    }
  };

  return Type1Font;
})();

var CFFFont = (function CFFFontClosure() {
  function CFFFont(file, properties) {
    this.properties = properties;

    var parser = new CFFParser(file, properties, SEAC_ANALYSIS_ENABLED);
    this.cff = parser.parse();
    var compiler = new CFFCompiler(this.cff);
    this.seacs = this.cff.seacs;
    try {
      this.data = compiler.compile();
    } catch (e) {
      warn('Failed to compile font ' + properties.loadedName);
      // There may have just been an issue with the compiler, set the data
      // anyway and hope the font loaded.
      this.data = file;
    }
  }

  CFFFont.prototype = {
    get numGlyphs() {
      return this.cff.charStrings.count;
    },
    getCharset: function CFFFont_getCharset() {
      return this.cff.charset.charset;
    },
    getGlyphMapping: function CFFFont_getGlyphMapping() {
      var cff = this.cff;
      var properties = this.properties;
      var charsets = cff.charset.charset;
      var charCodeToGlyphId;
      var glyphId;

      if (properties.composite) {
        charCodeToGlyphId = Object.create(null);
        if (cff.isCIDFont) {
          // If the font is actually a CID font then we should use the charset
          // to map CIDs to GIDs.
          for (glyphId = 0; glyphId < charsets.length; glyphId++) {
            var cid = charsets[glyphId];
            var charCode = properties.cMap.charCodeOf(cid);
            charCodeToGlyphId[charCode] = glyphId;
          }
        } else {
          // If it is NOT actually a CID font then CIDs should be mapped
          // directly to GIDs.
          for (glyphId = 0; glyphId < cff.charStrings.count; glyphId++) {
            charCodeToGlyphId[glyphId] = glyphId;
          }
        }
        return charCodeToGlyphId;
      }

      var encoding = cff.encoding ? cff.encoding.encoding : null;
      charCodeToGlyphId = type1FontGlyphMapping(properties, encoding, charsets);
      return charCodeToGlyphId;
    }
  };

  return CFFFont;
})();

// Workaround for seac on Windows.
(function checkSeacSupport() {
  if (typeof navigator !== 'undefined' && /Windows/.test(navigator.userAgent)) {
    SEAC_ANALYSIS_ENABLED = true;
  }
})();

// Workaround for Private Use Area characters in Chrome on Windows
// http://code.google.com/p/chromium/issues/detail?id=122465
// https://github.com/mozilla/pdf.js/issues/1689
(function checkChromeWindows() {
  if (typeof navigator !== 'undefined' &&
      /Windows.*Chrome/.test(navigator.userAgent)) {
    SKIP_PRIVATE_USE_RANGE_F000_TO_F01F = true;
  }
})();

exports.SEAC_ANALYSIS_ENABLED = SEAC_ANALYSIS_ENABLED;
exports.ErrorFont = ErrorFont;
exports.Font = Font;
exports.FontFlags = FontFlags;
exports.IdentityToUnicodeMap = IdentityToUnicodeMap;
exports.ToUnicodeMap = ToUnicodeMap;
exports.getFontType = getFontType;
}));


(function (root, factory) {
  {
    factory((root.pdfjsCoreFunction = {}), root.pdfjsSharedUtil,
      root.pdfjsCorePrimitives, root.pdfjsCorePsParser);
  }
}(this, function (exports, sharedUtil, corePrimitives, corePsParser) {

var error = sharedUtil.error;
var info = sharedUtil.info;
var isArray = sharedUtil.isArray;
var isBool = sharedUtil.isBool;
var isDict = corePrimitives.isDict;
var isStream = corePrimitives.isStream;
var PostScriptLexer = corePsParser.PostScriptLexer;
var PostScriptParser = corePsParser.PostScriptParser;

var PDFFunction = (function PDFFunctionClosure() {
  var CONSTRUCT_SAMPLED = 0;
  var CONSTRUCT_INTERPOLATED = 2;
  var CONSTRUCT_STICHED = 3;
  var CONSTRUCT_POSTSCRIPT = 4;

  return {
    getSampleArray: function PDFFunction_getSampleArray(size, outputSize, bps,
                                                       str) {
      var i, ii;
      var length = 1;
      for (i = 0, ii = size.length; i < ii; i++) {
        length *= size[i];
      }
      length *= outputSize;

      var array = new Array(length);
      var codeSize = 0;
      var codeBuf = 0;
      // 32 is a valid bps so shifting won't work
      var sampleMul = 1.0 / (Math.pow(2.0, bps) - 1);

      var strBytes = str.getBytes((length * bps + 7) / 8);
      var strIdx = 0;
      for (i = 0; i < length; i++) {
        while (codeSize < bps) {
          codeBuf <<= 8;
          codeBuf |= strBytes[strIdx++];
          codeSize += 8;
        }
        codeSize -= bps;
        array[i] = (codeBuf >> codeSize) * sampleMul;
        codeBuf &= (1 << codeSize) - 1;
      }
      return array;
    },

    getIR: function PDFFunction_getIR(xref, fn) {
      var dict = fn.dict;
      if (!dict) {
        dict = fn;
      }

      var types = [this.constructSampled,
                   null,
                   this.constructInterpolated,
                   this.constructStiched,
                   this.constructPostScript];

      var typeNum = dict.get('FunctionType');
      var typeFn = types[typeNum];
      if (!typeFn) {
        error('Unknown type of function');
      }

      return typeFn.call(this, fn, dict, xref);
    },

    fromIR: function PDFFunction_fromIR(IR) {
      var type = IR[0];
      switch (type) {
        case CONSTRUCT_SAMPLED:
          return this.constructSampledFromIR(IR);
        case CONSTRUCT_INTERPOLATED:
          return this.constructInterpolatedFromIR(IR);
        case CONSTRUCT_STICHED:
          return this.constructStichedFromIR(IR);
        //case CONSTRUCT_POSTSCRIPT:
        default:
          return this.constructPostScriptFromIR(IR);
      }
    },

    parse: function PDFFunction_parse(xref, fn) {
      var IR = this.getIR(xref, fn);
      return this.fromIR(IR);
    },

    parseArray: function PDFFunction_parseArray(xref, fnObj) {
      if (!isArray(fnObj)) {
        // not an array -- parsing as regular function
        return this.parse(xref, fnObj);
      }

      var fnArray = [];
      for (var j = 0, jj = fnObj.length; j < jj; j++) {
        var obj = xref.fetchIfRef(fnObj[j]);
        fnArray.push(PDFFunction.parse(xref, obj));
      }
      return function (src, srcOffset, dest, destOffset) {
        for (var i = 0, ii = fnArray.length; i < ii; i++) {
          fnArray[i](src, srcOffset, dest, destOffset + i);
        }
      };
    },

    constructSampled: function PDFFunction_constructSampled(str, dict) {
      function toMultiArray(arr) {
        var inputLength = arr.length;
        var out = [];
        var index = 0;
        for (var i = 0; i < inputLength; i += 2) {
          out[index] = [arr[i], arr[i + 1]];
          ++index;
        }
        return out;
      }
      var domain = dict.get('Domain');
      var range = dict.get('Range');

      if (!domain || !range) {
        error('No domain or range');
      }

      var inputSize = domain.length / 2;
      var outputSize = range.length / 2;

      domain = toMultiArray(domain);
      range = toMultiArray(range);

      var size = dict.get('Size');
      var bps = dict.get('BitsPerSample');
      var order = dict.get('Order') || 1;
      if (order !== 1) {
        // No description how cubic spline interpolation works in PDF32000:2008
        // As in poppler, ignoring order, linear interpolation may work as good
        info('No support for cubic spline interpolation: ' + order);
      }

      var encode = dict.get('Encode');
      if (!encode) {
        encode = [];
        for (var i = 0; i < inputSize; ++i) {
          encode.push(0);
          encode.push(size[i] - 1);
        }
      }
      encode = toMultiArray(encode);

      var decode = dict.get('Decode');
      if (!decode) {
        decode = range;
      } else {
        decode = toMultiArray(decode);
      }

      var samples = this.getSampleArray(size, outputSize, bps, str);

      return [
        CONSTRUCT_SAMPLED, inputSize, domain, encode, decode, samples, size,
        outputSize, Math.pow(2, bps) - 1, range
      ];
    },

    constructSampledFromIR: function PDFFunction_constructSampledFromIR(IR) {
      // See chapter 3, page 109 of the PDF reference
      function interpolate(x, xmin, xmax, ymin, ymax) {
        return ymin + ((x - xmin) * ((ymax - ymin) / (xmax - xmin)));
      }

      return function constructSampledFromIRResult(src, srcOffset,
                                                   dest, destOffset) {
        // See chapter 3, page 110 of the PDF reference.
        var m = IR[1];
        var domain = IR[2];
        var encode = IR[3];
        var decode = IR[4];
        var samples = IR[5];
        var size = IR[6];
        var n = IR[7];
        //var mask = IR[8];
        var range = IR[9];

        // Building the cube vertices: its part and sample index
        // http://rjwagner49.com/Mathematics/Interpolation.pdf
        var cubeVertices = 1 << m;
        var cubeN = new Float64Array(cubeVertices);
        var cubeVertex = new Uint32Array(cubeVertices);
        var i, j;
        for (j = 0; j < cubeVertices; j++) {
          cubeN[j] = 1;
        }

        var k = n, pos = 1;
        // Map x_i to y_j for 0 <= i < m using the sampled function.
        for (i = 0; i < m; ++i) {
          // x_i' = min(max(x_i, Domain_2i), Domain_2i+1)
          var domain_2i = domain[i][0];
          var domain_2i_1 = domain[i][1];
          var xi = Math.min(Math.max(src[srcOffset +i], domain_2i),
                            domain_2i_1);

          // e_i = Interpolate(x_i', Domain_2i, Domain_2i+1,
          //                   Encode_2i, Encode_2i+1)
          var e = interpolate(xi, domain_2i, domain_2i_1,
                              encode[i][0], encode[i][1]);

          // e_i' = min(max(e_i, 0), Size_i - 1)
          var size_i = size[i];
          e = Math.min(Math.max(e, 0), size_i - 1);

          // Adjusting the cube: N and vertex sample index
          var e0 = e < size_i - 1 ? Math.floor(e) : e - 1; // e1 = e0 + 1;
          var n0 = e0 + 1 - e; // (e1 - e) / (e1 - e0);
          var n1 = e - e0; // (e - e0) / (e1 - e0);
          var offset0 = e0 * k;
          var offset1 = offset0 + k; // e1 * k
          for (j = 0; j < cubeVertices; j++) {
            if (j & pos) {
              cubeN[j] *= n1;
              cubeVertex[j] += offset1;
            } else {
              cubeN[j] *= n0;
              cubeVertex[j] += offset0;
            }
          }

          k *= size_i;
          pos <<= 1;
        }

        for (j = 0; j < n; ++j) {
          // Sum all cube vertices' samples portions
          var rj = 0;
          for (i = 0; i < cubeVertices; i++) {
            rj += samples[cubeVertex[i] + j] * cubeN[i];
          }

          // r_j' = Interpolate(r_j, 0, 2^BitsPerSample - 1,
          //                    Decode_2j, Decode_2j+1)
          rj = interpolate(rj, 0, 1, decode[j][0], decode[j][1]);

          // y_j = min(max(r_j, range_2j), range_2j+1)
          dest[destOffset + j] = Math.min(Math.max(rj, range[j][0]),
                                          range[j][1]);
        }
      };
    },

    constructInterpolated: function PDFFunction_constructInterpolated(str,
                                                                      dict) {
      var c0 = dict.get('C0') || [0];
      var c1 = dict.get('C1') || [1];
      var n = dict.get('N');

      if (!isArray(c0) || !isArray(c1)) {
        error('Illegal dictionary for interpolated function');
      }

      var length = c0.length;
      var diff = [];
      for (var i = 0; i < length; ++i) {
        diff.push(c1[i] - c0[i]);
      }

      return [CONSTRUCT_INTERPOLATED, c0, diff, n];
    },

    constructInterpolatedFromIR:
      function PDFFunction_constructInterpolatedFromIR(IR) {
      var c0 = IR[1];
      var diff = IR[2];
      var n = IR[3];

      var length = diff.length;

      return function constructInterpolatedFromIRResult(src, srcOffset,
                                                        dest, destOffset) {
        var x = n === 1 ? src[srcOffset] : Math.pow(src[srcOffset], n);

        for (var j = 0; j < length; ++j) {
          dest[destOffset + j] = c0[j] + (x * diff[j]);
        }
      };
    },

    constructStiched: function PDFFunction_constructStiched(fn, dict, xref) {
      var domain = dict.get('Domain');

      if (!domain) {
        error('No domain');
      }

      var inputSize = domain.length / 2;
      if (inputSize !== 1) {
        error('Bad domain for stiched function');
      }

      var fnRefs = dict.get('Functions');
      var fns = [];
      for (var i = 0, ii = fnRefs.length; i < ii; ++i) {
        fns.push(PDFFunction.getIR(xref, xref.fetchIfRef(fnRefs[i])));
      }

      var bounds = dict.get('Bounds');
      var encode = dict.get('Encode');

      return [CONSTRUCT_STICHED, domain, bounds, encode, fns];
    },

    constructStichedFromIR: function PDFFunction_constructStichedFromIR(IR) {
      var domain = IR[1];
      var bounds = IR[2];
      var encode = IR[3];
      var fnsIR = IR[4];
      var fns = [];
      var tmpBuf = new Float32Array(1);

      for (var i = 0, ii = fnsIR.length; i < ii; i++) {
        fns.push(PDFFunction.fromIR(fnsIR[i]));
      }

      return function constructStichedFromIRResult(src, srcOffset,
                                                   dest, destOffset) {
        var clip = function constructStichedFromIRClip(v, min, max) {
          if (v > max) {
            v = max;
          } else if (v < min) {
            v = min;
          }
          return v;
        };

        // clip to domain
        var v = clip(src[srcOffset], domain[0], domain[1]);
        // calulate which bound the value is in
        for (var i = 0, ii = bounds.length; i < ii; ++i) {
          if (v < bounds[i]) {
            break;
          }
        }

        // encode value into domain of function
        var dmin = domain[0];
        if (i > 0) {
          dmin = bounds[i - 1];
        }
        var dmax = domain[1];
        if (i < bounds.length) {
          dmax = bounds[i];
        }

        var rmin = encode[2 * i];
        var rmax = encode[2 * i + 1];

        // Prevent the value from becoming NaN as a result
        // of division by zero (fixes issue6113.pdf).
        tmpBuf[0] = dmin === dmax ? rmin :
                    rmin + (v - dmin) * (rmax - rmin) / (dmax - dmin);

        // call the appropriate function
        fns[i](tmpBuf, 0, dest, destOffset);
      };
    },

    constructPostScript: function PDFFunction_constructPostScript(fn, dict,
                                                                  xref) {
      var domain = dict.get('Domain');
      var range = dict.get('Range');

      if (!domain) {
        error('No domain.');
      }

      if (!range) {
        error('No range.');
      }

      var lexer = new PostScriptLexer(fn);
      var parser = new PostScriptParser(lexer);
      var code = parser.parse();

      return [CONSTRUCT_POSTSCRIPT, domain, range, code];
    },

    constructPostScriptFromIR: function PDFFunction_constructPostScriptFromIR(
                                          IR) {
      var domain = IR[1];
      var range = IR[2];
      var code = IR[3];

      var compiled = (new PostScriptCompiler()).compile(code, domain, range);
      if (compiled) {
        // Compiled function consists of simple expressions such as addition,
        // subtraction, Math.max, and also contains 'var' and 'return'
        // statements. See the generation in the PostScriptCompiler below.
        /*jshint -W054 */
        return new Function('src', 'srcOffset', 'dest', 'destOffset', compiled);
      }

      info('Unable to compile PS function');

      var numOutputs = range.length >> 1;
      var numInputs = domain.length >> 1;
      var evaluator = new PostScriptEvaluator(code);
      // Cache the values for a big speed up, the cache size is limited though
      // since the number of possible values can be huge from a PS function.
      var cache = Object.create(null);
      // The MAX_CACHE_SIZE is set to ~4x the maximum number of distinct values
      // seen in our tests.
      var MAX_CACHE_SIZE = 2048 * 4;
      var cache_available = MAX_CACHE_SIZE;
      var tmpBuf = new Float32Array(numInputs);

      return function constructPostScriptFromIRResult(src, srcOffset,
                                                      dest, destOffset) {
        var i, value;
        var key = '';
        var input = tmpBuf;
        for (i = 0; i < numInputs; i++) {
          value = src[srcOffset + i];
          input[i] = value;
          key += value + '_';
        }

        var cachedValue = cache[key];
        if (cachedValue !== undefined) {
          dest.set(cachedValue, destOffset);
          return;
        }

        var output = new Float32Array(numOutputs);
        var stack = evaluator.execute(input);
        var stackIndex = stack.length - numOutputs;
        for (i = 0; i < numOutputs; i++) {
          value = stack[stackIndex + i];
          var bound = range[i * 2];
          if (value < bound) {
            value = bound;
          } else {
            bound = range[i * 2 +1];
            if (value > bound) {
              value = bound;
            }
          }
          output[i] = value;
        }
        if (cache_available > 0) {
          cache_available--;
          cache[key] = output;
        }
        dest.set(output, destOffset);
      };
    }
  };
})();

function isPDFFunction(v) {
  var fnDict;
  if (typeof v !== 'object') {
    return false;
  } else if (isDict(v)) {
    fnDict = v;
  } else if (isStream(v)) {
    fnDict = v.dict;
  } else {
    return false;
  }
  return fnDict.has('FunctionType');
}

var PostScriptStack = (function PostScriptStackClosure() {
  var MAX_STACK_SIZE = 100;
  function PostScriptStack(initialStack) {
    this.stack = !initialStack ? [] :
                 Array.prototype.slice.call(initialStack, 0);
  }

  PostScriptStack.prototype = {
    push: function PostScriptStack_push(value) {
      if (this.stack.length >= MAX_STACK_SIZE) {
        error('PostScript function stack overflow.');
      }
      this.stack.push(value);
    },
    pop: function PostScriptStack_pop() {
      if (this.stack.length <= 0) {
        error('PostScript function stack underflow.');
      }
      return this.stack.pop();
    },
    copy: function PostScriptStack_copy(n) {
      if (this.stack.length + n >= MAX_STACK_SIZE) {
        error('PostScript function stack overflow.');
      }
      var stack = this.stack;
      for (var i = stack.length - n, j = n - 1; j >= 0; j--, i++) {
        stack.push(stack[i]);
      }
    },
    index: function PostScriptStack_index(n) {
      this.push(this.stack[this.stack.length - n - 1]);
    },
    // rotate the last n stack elements p times
    roll: function PostScriptStack_roll(n, p) {
      var stack = this.stack;
      var l = stack.length - n;
      var r = stack.length - 1, c = l + (p - Math.floor(p / n) * n), i, j, t;
      for (i = l, j = r; i < j; i++, j--) {
        t = stack[i]; stack[i] = stack[j]; stack[j] = t;
      }
      for (i = l, j = c - 1; i < j; i++, j--) {
        t = stack[i]; stack[i] = stack[j]; stack[j] = t;
      }
      for (i = c, j = r; i < j; i++, j--) {
        t = stack[i]; stack[i] = stack[j]; stack[j] = t;
      }
    }
  };
  return PostScriptStack;
})();
var PostScriptEvaluator = (function PostScriptEvaluatorClosure() {
  function PostScriptEvaluator(operators) {
    this.operators = operators;
  }
  PostScriptEvaluator.prototype = {
    execute: function PostScriptEvaluator_execute(initialStack) {
      var stack = new PostScriptStack(initialStack);
      var counter = 0;
      var operators = this.operators;
      var length = operators.length;
      var operator, a, b;
      while (counter < length) {
        operator = operators[counter++];
        if (typeof operator === 'number') {
          // Operator is really an operand and should be pushed to the stack.
          stack.push(operator);
          continue;
        }
        switch (operator) {
          // non standard ps operators
          case 'jz': // jump if false
            b = stack.pop();
            a = stack.pop();
            if (!a) {
              counter = b;
            }
            break;
          case 'j': // jump
            a = stack.pop();
            counter = a;
            break;

          // all ps operators in alphabetical order (excluding if/ifelse)
          case 'abs':
            a = stack.pop();
            stack.push(Math.abs(a));
            break;
          case 'add':
            b = stack.pop();
            a = stack.pop();
            stack.push(a + b);
            break;
          case 'and':
            b = stack.pop();
            a = stack.pop();
            if (isBool(a) && isBool(b)) {
              stack.push(a && b);
            } else {
              stack.push(a & b);
            }
            break;
          case 'atan':
            a = stack.pop();
            stack.push(Math.atan(a));
            break;
          case 'bitshift':
            b = stack.pop();
            a = stack.pop();
            if (a > 0) {
              stack.push(a << b);
            } else {
              stack.push(a >> b);
            }
            break;
          case 'ceiling':
            a = stack.pop();
            stack.push(Math.ceil(a));
            break;
          case 'copy':
            a = stack.pop();
            stack.copy(a);
            break;
          case 'cos':
            a = stack.pop();
            stack.push(Math.cos(a));
            break;
          case 'cvi':
            a = stack.pop() | 0;
            stack.push(a);
            break;
          case 'cvr':
            // noop
            break;
          case 'div':
            b = stack.pop();
            a = stack.pop();
            stack.push(a / b);
            break;
          case 'dup':
            stack.copy(1);
            break;
          case 'eq':
            b = stack.pop();
            a = stack.pop();
            stack.push(a === b);
            break;
          case 'exch':
            stack.roll(2, 1);
            break;
          case 'exp':
            b = stack.pop();
            a = stack.pop();
            stack.push(Math.pow(a, b));
            break;
          case 'false':
            stack.push(false);
            break;
          case 'floor':
            a = stack.pop();
            stack.push(Math.floor(a));
            break;
          case 'ge':
            b = stack.pop();
            a = stack.pop();
            stack.push(a >= b);
            break;
          case 'gt':
            b = stack.pop();
            a = stack.pop();
            stack.push(a > b);
            break;
          case 'idiv':
            b = stack.pop();
            a = stack.pop();
            stack.push((a / b) | 0);
            break;
          case 'index':
            a = stack.pop();
            stack.index(a);
            break;
          case 'le':
            b = stack.pop();
            a = stack.pop();
            stack.push(a <= b);
            break;
          case 'ln':
            a = stack.pop();
            stack.push(Math.log(a));
            break;
          case 'log':
            a = stack.pop();
            stack.push(Math.log(a) / Math.LN10);
            break;
          case 'lt':
            b = stack.pop();
            a = stack.pop();
            stack.push(a < b);
            break;
          case 'mod':
            b = stack.pop();
            a = stack.pop();
            stack.push(a % b);
            break;
          case 'mul':
            b = stack.pop();
            a = stack.pop();
            stack.push(a * b);
            break;
          case 'ne':
            b = stack.pop();
            a = stack.pop();
            stack.push(a !== b);
            break;
          case 'neg':
            a = stack.pop();
            stack.push(-a);
            break;
          case 'not':
            a = stack.pop();
            if (isBool(a)) {
              stack.push(!a);
            } else {
              stack.push(~a);
            }
            break;
          case 'or':
            b = stack.pop();
            a = stack.pop();
            if (isBool(a) && isBool(b)) {
              stack.push(a || b);
            } else {
              stack.push(a | b);
            }
            break;
          case 'pop':
            stack.pop();
            break;
          case 'roll':
            b = stack.pop();
            a = stack.pop();
            stack.roll(a, b);
            break;
          case 'round':
            a = stack.pop();
            stack.push(Math.round(a));
            break;
          case 'sin':
            a = stack.pop();
            stack.push(Math.sin(a));
            break;
          case 'sqrt':
            a = stack.pop();
            stack.push(Math.sqrt(a));
            break;
          case 'sub':
            b = stack.pop();
            a = stack.pop();
            stack.push(a - b);
            break;
          case 'true':
            stack.push(true);
            break;
          case 'truncate':
            a = stack.pop();
            a = a < 0 ? Math.ceil(a) : Math.floor(a);
            stack.push(a);
            break;
          case 'xor':
            b = stack.pop();
            a = stack.pop();
            if (isBool(a) && isBool(b)) {
              stack.push(a !== b);
            } else {
              stack.push(a ^ b);
            }
            break;
          default:
            error('Unknown operator ' + operator);
            break;
        }
      }
      return stack.stack;
    }
  };
  return PostScriptEvaluator;
})();

// Most of the PDFs functions consist of simple operations such as:
//   roll, exch, sub, cvr, pop, index, dup, mul, if, gt, add.
//
// We can compile most of such programs, and at the same moment, we can
// optimize some expressions using basic math properties. Keeping track of
// min/max values will allow us to avoid extra Math.min/Math.max calls.
var PostScriptCompiler = (function PostScriptCompilerClosure() {
  function AstNode(type) {
    this.type = type;
  }
  AstNode.prototype.visit = function (visitor) {
    throw new Error('abstract method');
  };

  function AstArgument(index, min, max) {
    AstNode.call(this, 'args');
    this.index = index;
    this.min = min;
    this.max = max;
  }
  AstArgument.prototype = Object.create(AstNode.prototype);
  AstArgument.prototype.visit = function (visitor) {
    visitor.visitArgument(this);
  };

  function AstLiteral(number) {
    AstNode.call(this, 'literal');
    this.number = number;
    this.min = number;
    this.max = number;
  }
  AstLiteral.prototype = Object.create(AstNode.prototype);
  AstLiteral.prototype.visit = function (visitor) {
    visitor.visitLiteral(this);
  };

  function AstBinaryOperation(op, arg1, arg2, min, max) {
    AstNode.call(this, 'binary');
    this.op = op;
    this.arg1 = arg1;
    this.arg2 = arg2;
    this.min = min;
    this.max = max;
  }
  AstBinaryOperation.prototype = Object.create(AstNode.prototype);
  AstBinaryOperation.prototype.visit = function (visitor) {
    visitor.visitBinaryOperation(this);
  };

  function AstMin(arg, max) {
    AstNode.call(this, 'max');
    this.arg = arg;
    this.min = arg.min;
    this.max = max;
  }
  AstMin.prototype = Object.create(AstNode.prototype);
  AstMin.prototype.visit = function (visitor) {
    visitor.visitMin(this);
  };

  function AstVariable(index, min, max) {
    AstNode.call(this, 'var');
    this.index = index;
    this.min = min;
    this.max = max;
  }
  AstVariable.prototype = Object.create(AstNode.prototype);
  AstVariable.prototype.visit = function (visitor) {
    visitor.visitVariable(this);
  };

  function AstVariableDefinition(variable, arg) {
    AstNode.call(this, 'definition');
    this.variable = variable;
    this.arg = arg;
  }
  AstVariableDefinition.prototype = Object.create(AstNode.prototype);
  AstVariableDefinition.prototype.visit = function (visitor) {
    visitor.visitVariableDefinition(this);
  };

  function ExpressionBuilderVisitor() {
    this.parts = [];
  }
  ExpressionBuilderVisitor.prototype = {
    visitArgument: function (arg) {
      this.parts.push('Math.max(', arg.min, ', Math.min(',
                      arg.max, ', src[srcOffset + ', arg.index, ']))');
    },
    visitVariable: function (variable) {
      this.parts.push('v', variable.index);
    },
    visitLiteral: function (literal) {
      this.parts.push(literal.number);
    },
    visitBinaryOperation: function (operation) {
      this.parts.push('(');
      operation.arg1.visit(this);
      this.parts.push(' ', operation.op, ' ');
      operation.arg2.visit(this);
      this.parts.push(')');
    },
    visitVariableDefinition: function (definition) {
      this.parts.push('var ');
      definition.variable.visit(this);
      this.parts.push(' = ');
      definition.arg.visit(this);
      this.parts.push(';');
    },
    visitMin: function (max) {
      this.parts.push('Math.min(');
      max.arg.visit(this);
      this.parts.push(', ', max.max, ')');
    },
    toString: function () {
      return this.parts.join('');
    }
  };

  function buildAddOperation(num1, num2) {
    if (num2.type === 'literal' && num2.number === 0) {
      // optimization: second operand is 0
      return num1;
    }
    if (num1.type === 'literal' && num1.number === 0) {
      // optimization: first operand is 0
      return num2;
    }
    if (num2.type === 'literal' && num1.type === 'literal') {
      // optimization: operands operand are literals
      return new AstLiteral(num1.number + num2.number);
    }
    return new AstBinaryOperation('+', num1, num2,
                                  num1.min + num2.min, num1.max + num2.max);
  }

  function buildMulOperation(num1, num2) {
    if (num2.type === 'literal') {
      // optimization: second operands is a literal...
      if (num2.number === 0) {
        return new AstLiteral(0); // and it's 0
      } else if (num2.number === 1) {
        return num1; // and it's 1
      } else if (num1.type === 'literal') {
        // ... and first operands is a literal too
        return new AstLiteral(num1.number * num2.number);
      }
    }
    if (num1.type === 'literal') {
      // optimization: first operands is a literal...
      if (num1.number === 0) {
        return new AstLiteral(0); // and it's 0
      } else if (num1.number === 1) {
        return num2; // and it's 1
      }
    }
    var min = Math.min(num1.min * num2.min, num1.min * num2.max,
                       num1.max * num2.min, num1.max * num2.max);
    var max = Math.max(num1.min * num2.min, num1.min * num2.max,
                       num1.max * num2.min, num1.max * num2.max);
    return new AstBinaryOperation('*', num1, num2, min, max);
  }

  function buildSubOperation(num1, num2) {
    if (num2.type === 'literal') {
      // optimization: second operands is a literal...
      if (num2.number === 0) {
        return num1; // ... and it's 0
      } else if (num1.type === 'literal') {
        // ... and first operands is a literal too
        return new AstLiteral(num1.number - num2.number);
      }
    }
    if (num2.type === 'binary' && num2.op === '-' &&
      num1.type === 'literal' && num1.number === 1 &&
      num2.arg1.type === 'literal' && num2.arg1.number === 1) {
      // optimization for case: 1 - (1 - x)
      return num2.arg2;
    }
    return new AstBinaryOperation('-', num1, num2,
                                  num1.min - num2.max, num1.max - num2.min);
  }

  function buildMinOperation(num1, max) {
    if (num1.min >= max) {
      // optimization: num1 min value is not less than required max
      return new AstLiteral(max); // just returning max
    } else if (num1.max <= max) {
      // optimization: num1 max value is not greater than required max
      return num1; // just returning an argument
    }
    return new AstMin(num1, max);
  }

  function PostScriptCompiler() {}
  PostScriptCompiler.prototype = {
    compile: function PostScriptCompiler_compile(code, domain, range) {
      var stack = [];
      var i, ii;
      var instructions = [];
      var inputSize = domain.length >> 1, outputSize = range.length >> 1;
      var lastRegister = 0;
      var n, j;
      var num1, num2, ast1, ast2, tmpVar, item;
      for (i = 0; i < inputSize; i++) {
        stack.push(new AstArgument(i, domain[i * 2], domain[i * 2 + 1]));
      }

      for (i = 0, ii = code.length; i < ii; i++) {
        item = code[i];
        if (typeof item === 'number') {
          stack.push(new AstLiteral(item));
          continue;
        }

        switch (item) {
          case 'add':
            if (stack.length < 2) {
              return null;
            }
            num2 = stack.pop();
            num1 = stack.pop();
            stack.push(buildAddOperation(num1, num2));
            break;
          case 'cvr':
            if (stack.length < 1) {
              return null;
            }
            break;
          case 'mul':
            if (stack.length < 2) {
              return null;
            }
            num2 = stack.pop();
            num1 = stack.pop();
            stack.push(buildMulOperation(num1, num2));
            break;
          case 'sub':
            if (stack.length < 2) {
              return null;
            }
            num2 = stack.pop();
            num1 = stack.pop();
            stack.push(buildSubOperation(num1, num2));
            break;
          case 'exch':
            if (stack.length < 2) {
              return null;
            }
            ast1 = stack.pop(); ast2 = stack.pop();
            stack.push(ast1, ast2);
            break;
          case 'pop':
            if (stack.length < 1) {
              return null;
            }
            stack.pop();
            break;
          case 'index':
            if (stack.length < 1) {
              return null;
            }
            num1 = stack.pop();
            if (num1.type !== 'literal') {
              return null;
            }
            n = num1.number;
            if (n < 0 || (n|0) !== n || stack.length < n) {
              return null;
            }
            ast1 = stack[stack.length - n - 1];
            if (ast1.type === 'literal' || ast1.type === 'var') {
              stack.push(ast1);
              break;
            }
            tmpVar = new AstVariable(lastRegister++, ast1.min, ast1.max);
            stack[stack.length - n - 1] = tmpVar;
            stack.push(tmpVar);
            instructions.push(new AstVariableDefinition(tmpVar, ast1));
            break;
          case 'dup':
            if (stack.length < 1) {
              return null;
            }
            if (typeof code[i + 1] === 'number' && code[i + 2] === 'gt' &&
                code[i + 3] === i + 7 && code[i + 4] === 'jz' &&
                code[i + 5] === 'pop' && code[i + 6] === code[i + 1]) {
              // special case of the commands sequence for the min operation
              num1 = stack.pop();
              stack.push(buildMinOperation(num1, code[i + 1]));
              i += 6;
              break;
            }
            ast1 = stack[stack.length - 1];
            if (ast1.type === 'literal' || ast1.type === 'var') {
              // we don't have to save into intermediate variable a literal or
              // variable.
              stack.push(ast1);
              break;
            }
            tmpVar = new AstVariable(lastRegister++, ast1.min, ast1.max);
            stack[stack.length - 1] = tmpVar;
            stack.push(tmpVar);
            instructions.push(new AstVariableDefinition(tmpVar, ast1));
            break;
          case 'roll':
            if (stack.length < 2) {
              return null;
            }
            num2 = stack.pop();
            num1 = stack.pop();
            if (num2.type !== 'literal' || num1.type !== 'literal') {
              // both roll operands must be numbers
              return null;
            }
            j = num2.number;
            n = num1.number;
            if (n <= 0 || (n|0) !== n || (j|0) !== j || stack.length < n) {
              // ... and integers
              return null;
            }
            j = ((j % n) + n) % n;
            if (j === 0) {
              break; // just skipping -- there are nothing to rotate
            }
            Array.prototype.push.apply(stack,
                                       stack.splice(stack.length - n, n - j));
            break;
          default:
            return null; // unsupported operator
        }
      }

      if (stack.length !== outputSize) {
        return null;
      }

      var result = [];
      instructions.forEach(function (instruction) {
        var statementBuilder = new ExpressionBuilderVisitor();
        instruction.visit(statementBuilder);
        result.push(statementBuilder.toString());
      });
      stack.forEach(function (expr, i) {
        var statementBuilder = new ExpressionBuilderVisitor();
        expr.visit(statementBuilder);
        var min = range[i * 2], max = range[i * 2 + 1];
        var out = [statementBuilder.toString()];
        if (min > expr.min) {
          out.unshift('Math.max(', min, ', ');
          out.push(')');
        }
        if (max < expr.max) {
          out.unshift('Math.min(', max, ', ');
          out.push(')');
        }
        out.unshift('dest[destOffset + ', i, '] = ');
        out.push(';');
        result.push(out.join(''));
      });
      return result.join('\n');
    }
  };

  return PostScriptCompiler;
})();

exports.isPDFFunction = isPDFFunction;
exports.PDFFunction = PDFFunction;
exports.PostScriptEvaluator = PostScriptEvaluator;
exports.PostScriptCompiler = PostScriptCompiler;
}));


(function (root, factory) {
  {
    factory((root.pdfjsCoreColorSpace = {}), root.pdfjsSharedUtil,
      root.pdfjsCorePrimitives, root.pdfjsCoreFunction);
  }
}(this, function (exports, sharedUtil, corePrimitives, coreFunction) {

var error = sharedUtil.error;
var info = sharedUtil.info;
var isArray = sharedUtil.isArray;
var isString = sharedUtil.isString;
var shadow = sharedUtil.shadow;
var warn = sharedUtil.warn;
var isDict = corePrimitives.isDict;
var isName = corePrimitives.isName;
var isStream = corePrimitives.isStream;
var PDFFunction = coreFunction.PDFFunction;

var ColorSpace = (function ColorSpaceClosure() {
  /**
   * Resizes an RGB image with 3 components.
   * @param {TypedArray} src - The source buffer.
   * @param {Number} bpc - Number of bits per component.
   * @param {Number} w1 - Original width.
   * @param {Number} h1 - Original height.
   * @param {Number} w2 - New width.
   * @param {Number} h2 - New height.
   * @param {Number} alpha01 - Size reserved for the alpha channel.
   * @param {TypedArray} dest - The destination buffer.
   */
  function resizeRgbImage(src, bpc, w1, h1, w2, h2, alpha01, dest) {
    var COMPONENTS = 3;
    alpha01 = alpha01 !== 1 ? 0 : alpha01;
    var xRatio = w1 / w2;
    var yRatio = h1 / h2;
    var i, j, py, newIndex = 0, oldIndex;
    var xScaled = new Uint16Array(w2);
    var w1Scanline = w1 * COMPONENTS;

    for (i = 0; i < w2; i++) {
      xScaled[i] = Math.floor(i * xRatio) * COMPONENTS;
    }
    for (i = 0; i < h2; i++) {
      py = Math.floor(i * yRatio) * w1Scanline;
      for (j = 0; j < w2; j++) {
        oldIndex = py + xScaled[j];
        dest[newIndex++] = src[oldIndex++];
        dest[newIndex++] = src[oldIndex++];
        dest[newIndex++] = src[oldIndex++];
        newIndex += alpha01;
      }
    }
  }

  // Constructor should define this.numComps, this.defaultColor, this.name
  function ColorSpace() {
    error('should not call ColorSpace constructor');
  }

  ColorSpace.prototype = {
    /**
     * Converts the color value to the RGB color. The color components are
     * located in the src array starting from the srcOffset. Returns the array
     * of the rgb components, each value ranging from [0,255].
     */
    getRgb: function ColorSpace_getRgb(src, srcOffset) {
      var rgb = new Uint8Array(3);
      this.getRgbItem(src, srcOffset, rgb, 0);
      return rgb;
    },
    /**
     * Converts the color value to the RGB color, similar to the getRgb method.
     * The result placed into the dest array starting from the destOffset.
     */
    getRgbItem: function ColorSpace_getRgbItem(src, srcOffset,
                                               dest, destOffset) {
      error('Should not call ColorSpace.getRgbItem');
    },
    /**
     * Converts the specified number of the color values to the RGB colors.
     * The colors are located in the src array starting from the srcOffset.
     * The result is placed into the dest array starting from the destOffset.
     * The src array items shall be in [0,2^bits) range, the dest array items
     * will be in [0,255] range. alpha01 indicates how many alpha components
     * there are in the dest array; it will be either 0 (RGB array) or 1 (RGBA
     * array).
     */
    getRgbBuffer: function ColorSpace_getRgbBuffer(src, srcOffset, count,
                                                   dest, destOffset, bits,
                                                   alpha01) {
      error('Should not call ColorSpace.getRgbBuffer');
    },
    /**
     * Determines the number of bytes required to store the result of the
     * conversion done by the getRgbBuffer method. As in getRgbBuffer,
     * |alpha01| is either 0 (RGB output) or 1 (RGBA output).
     */
    getOutputLength: function ColorSpace_getOutputLength(inputLength,
                                                         alpha01) {
      error('Should not call ColorSpace.getOutputLength');
    },
    /**
     * Returns true if source data will be equal the result/output data.
     */
    isPassthrough: function ColorSpace_isPassthrough(bits) {
      return false;
    },
    /**
     * Fills in the RGB colors in the destination buffer.  alpha01 indicates
     * how many alpha components there are in the dest array; it will be either
     * 0 (RGB array) or 1 (RGBA array).
     */
    fillRgb: function ColorSpace_fillRgb(dest, originalWidth,
                                         originalHeight, width, height,
                                         actualHeight, bpc, comps, alpha01) {
      var count = originalWidth * originalHeight;
      var rgbBuf = null;
      var numComponentColors = 1 << bpc;
      var needsResizing = originalHeight !== height || originalWidth !== width;
      var i, ii;

      if (this.isPassthrough(bpc)) {
        rgbBuf = comps;
      } else if (this.numComps === 1 && count > numComponentColors &&
          this.name !== 'DeviceGray' && this.name !== 'DeviceRGB') {
        // Optimization: create a color map when there is just one component and
        // we are converting more colors than the size of the color map. We
        // don't build the map if the colorspace is gray or rgb since those
        // methods are faster than building a map. This mainly offers big speed
        // ups for indexed and alternate colorspaces.
        //
        // TODO it may be worth while to cache the color map. While running
        // testing I never hit a cache so I will leave that out for now (perhaps
        // we are reparsing colorspaces too much?).
        var allColors = bpc <= 8 ? new Uint8Array(numComponentColors) :
                                   new Uint16Array(numComponentColors);
        var key;
        for (i = 0; i < numComponentColors; i++) {
          allColors[i] = i;
        }
        var colorMap = new Uint8Array(numComponentColors * 3);
        this.getRgbBuffer(allColors, 0, numComponentColors, colorMap, 0, bpc,
                          /* alpha01 = */ 0);

        var destPos, rgbPos;
        if (!needsResizing) {
          // Fill in the RGB values directly into |dest|.
          destPos = 0;
          for (i = 0; i < count; ++i) {
            key = comps[i] * 3;
            dest[destPos++] = colorMap[key];
            dest[destPos++] = colorMap[key + 1];
            dest[destPos++] = colorMap[key + 2];
            destPos += alpha01;
          }
        } else {
          rgbBuf = new Uint8Array(count * 3);
          rgbPos = 0;
          for (i = 0; i < count; ++i) {
            key = comps[i] * 3;
            rgbBuf[rgbPos++] = colorMap[key];
            rgbBuf[rgbPos++] = colorMap[key + 1];
            rgbBuf[rgbPos++] = colorMap[key + 2];
          }
        }
      } else {
        if (!needsResizing) {
          // Fill in the RGB values directly into |dest|.
          this.getRgbBuffer(comps, 0, width * actualHeight, dest, 0, bpc,
                            alpha01);
        } else {
          rgbBuf = new Uint8Array(count * 3);
          this.getRgbBuffer(comps, 0, count, rgbBuf, 0, bpc,
                            /* alpha01 = */ 0);
        }
      }

      if (rgbBuf) {
        if (needsResizing) {
          resizeRgbImage(rgbBuf, bpc, originalWidth, originalHeight,
                         width, height, alpha01, dest);
        } else {
          rgbPos = 0;
          destPos = 0;
          for (i = 0, ii = width * actualHeight; i < ii; i++) {
            dest[destPos++] = rgbBuf[rgbPos++];
            dest[destPos++] = rgbBuf[rgbPos++];
            dest[destPos++] = rgbBuf[rgbPos++];
            destPos += alpha01;
          }
        }
      }
    },
    /**
     * True if the colorspace has components in the default range of [0, 1].
     * This should be true for all colorspaces except for lab color spaces
     * which are [0,100], [-128, 127], [-128, 127].
     */
    usesZeroToOneRange: true
  };

  ColorSpace.parse = function ColorSpace_parse(cs, xref, res) {
    var IR = ColorSpace.parseToIR(cs, xref, res);
    if (IR instanceof AlternateCS) {
      return IR;
    }
    return ColorSpace.fromIR(IR);
  };

  ColorSpace.fromIR = function ColorSpace_fromIR(IR) {
    var name = isArray(IR) ? IR[0] : IR;
    var whitePoint, blackPoint, gamma;

    switch (name) {
      case 'DeviceGrayCS':
        return this.singletons.gray;
      case 'DeviceRgbCS':
        return this.singletons.rgb;
      case 'DeviceCmykCS':
        return this.singletons.cmyk;
      case 'CalGrayCS':
        whitePoint = IR[1];
        blackPoint = IR[2];
        gamma = IR[3];
        return new CalGrayCS(whitePoint, blackPoint, gamma);
      case 'CalRGBCS':
        whitePoint = IR[1];
        blackPoint = IR[2];
        gamma = IR[3];
        var matrix = IR[4];
        return new CalRGBCS(whitePoint, blackPoint, gamma, matrix);
      case 'PatternCS':
        var basePatternCS = IR[1];
        if (basePatternCS) {
          basePatternCS = ColorSpace.fromIR(basePatternCS);
        }
        return new PatternCS(basePatternCS);
      case 'IndexedCS':
        var baseIndexedCS = IR[1];
        var hiVal = IR[2];
        var lookup = IR[3];
        return new IndexedCS(ColorSpace.fromIR(baseIndexedCS), hiVal, lookup);
      case 'AlternateCS':
        var numComps = IR[1];
        var alt = IR[2];
        var tintFnIR = IR[3];

        return new AlternateCS(numComps, ColorSpace.fromIR(alt),
                               PDFFunction.fromIR(tintFnIR));
      case 'LabCS':
        whitePoint = IR[1];
        blackPoint = IR[2];
        var range = IR[3];
        return new LabCS(whitePoint, blackPoint, range);
      default:
        error('Unknown name ' + name);
    }
    return null;
  };

  ColorSpace.parseToIR = function ColorSpace_parseToIR(cs, xref, res) {
    if (isName(cs)) {
      var colorSpaces = res.get('ColorSpace');
      if (isDict(colorSpaces)) {
        var refcs = colorSpaces.get(cs.name);
        if (refcs) {
          cs = refcs;
        }
      }
    }

    cs = xref.fetchIfRef(cs);
    var mode;

    if (isName(cs)) {
      mode = cs.name;
      this.mode = mode;

      switch (mode) {
        case 'DeviceGray':
        case 'G':
          return 'DeviceGrayCS';
        case 'DeviceRGB':
        case 'RGB':
          return 'DeviceRgbCS';
        case 'DeviceCMYK':
        case 'CMYK':
          return 'DeviceCmykCS';
        case 'Pattern':
          return ['PatternCS', null];
        default:
          error('unrecognized colorspace ' + mode);
      }
    } else if (isArray(cs)) {
      mode = xref.fetchIfRef(cs[0]).name;
      this.mode = mode;
      var numComps, params, alt, whitePoint, blackPoint, gamma;

      switch (mode) {
        case 'DeviceGray':
        case 'G':
          return 'DeviceGrayCS';
        case 'DeviceRGB':
        case 'RGB':
          return 'DeviceRgbCS';
        case 'DeviceCMYK':
        case 'CMYK':
          return 'DeviceCmykCS';
        case 'CalGray':
          params = xref.fetchIfRef(cs[1]);
          whitePoint = params.get('WhitePoint');
          blackPoint = params.get('BlackPoint');
          gamma = params.get('Gamma');
          return ['CalGrayCS', whitePoint, blackPoint, gamma];
        case 'CalRGB':
          params = xref.fetchIfRef(cs[1]);
          whitePoint = params.get('WhitePoint');
          blackPoint = params.get('BlackPoint');
          gamma = params.get('Gamma');
          var matrix = params.get('Matrix');
          return ['CalRGBCS', whitePoint, blackPoint, gamma, matrix];
        case 'ICCBased':
          var stream = xref.fetchIfRef(cs[1]);
          var dict = stream.dict;
          numComps = dict.get('N');
          alt = dict.get('Alternate');
          if (alt) {
            var altIR = ColorSpace.parseToIR(alt, xref, res);
            // Parse the /Alternate CS to ensure that the number of components
            // are correct, and also (indirectly) that it is not a PatternCS.
            var altCS = ColorSpace.fromIR(altIR);
            if (altCS.numComps === numComps) {
              return altIR;
            }
            warn('ICCBased color space: Ignoring incorrect /Alternate entry.');
          }
          if (numComps === 1) {
            return 'DeviceGrayCS';
          } else if (numComps === 3) {
            return 'DeviceRgbCS';
          } else if (numComps === 4) {
            return 'DeviceCmykCS';
          }
          break;
        case 'Pattern':
          var basePatternCS = cs[1] || null;
          if (basePatternCS) {
            basePatternCS = ColorSpace.parseToIR(basePatternCS, xref, res);
          }
          return ['PatternCS', basePatternCS];
        case 'Indexed':
        case 'I':
          var baseIndexedCS = ColorSpace.parseToIR(cs[1], xref, res);
          var hiVal = xref.fetchIfRef(cs[2]) + 1;
          var lookup = xref.fetchIfRef(cs[3]);
          if (isStream(lookup)) {
            lookup = lookup.getBytes();
          }
          return ['IndexedCS', baseIndexedCS, hiVal, lookup];
        case 'Separation':
        case 'DeviceN':
          var name = xref.fetchIfRef(cs[1]);
          numComps = 1;
          if (isName(name)) {
            numComps = 1;
          } else if (isArray(name)) {
            numComps = name.length;
          }
          alt = ColorSpace.parseToIR(cs[2], xref, res);
          var tintFnIR = PDFFunction.getIR(xref, xref.fetchIfRef(cs[3]));
          return ['AlternateCS', numComps, alt, tintFnIR];
        case 'Lab':
          params = xref.fetchIfRef(cs[1]);
          whitePoint = params.get('WhitePoint');
          blackPoint = params.get('BlackPoint');
          var range = params.get('Range');
          return ['LabCS', whitePoint, blackPoint, range];
        default:
          error('unimplemented color space object "' + mode + '"');
      }
    } else {
      error('unrecognized color space object: "' + cs + '"');
    }
    return null;
  };
  /**
   * Checks if a decode map matches the default decode map for a color space.
   * This handles the general decode maps where there are two values per
   * component. e.g. [0, 1, 0, 1, 0, 1] for a RGB color.
   * This does not handle Lab, Indexed, or Pattern decode maps since they are
   * slightly different.
   * @param {Array} decode Decode map (usually from an image).
   * @param {Number} n Number of components the color space has.
   */
  ColorSpace.isDefaultDecode = function ColorSpace_isDefaultDecode(decode, n) {
    if (!isArray(decode)) {
      return true;
    }

    if (n * 2 !== decode.length) {
      warn('The decode map is not the correct length');
      return true;
    }
    for (var i = 0, ii = decode.length; i < ii; i += 2) {
      if (decode[i] !== 0 || decode[i + 1] !== 1) {
        return false;
      }
    }
    return true;
  };

  ColorSpace.singletons = {
    get gray() {
      return shadow(this, 'gray', new DeviceGrayCS());
    },
    get rgb() {
      return shadow(this, 'rgb', new DeviceRgbCS());
    },
    get cmyk() {
      return shadow(this, 'cmyk', new DeviceCmykCS());
    }
  };

  return ColorSpace;
})();

/**
 * Alternate color space handles both Separation and DeviceN color spaces.  A
 * Separation color space is actually just a DeviceN with one color component.
 * Both color spaces use a tinting function to convert colors to a base color
 * space.
 */
var AlternateCS = (function AlternateCSClosure() {
  function AlternateCS(numComps, base, tintFn) {
    this.name = 'Alternate';
    this.numComps = numComps;
    this.defaultColor = new Float32Array(numComps);
    for (var i = 0; i < numComps; ++i) {
      this.defaultColor[i] = 1;
    }
    this.base = base;
    this.tintFn = tintFn;
    this.tmpBuf = new Float32Array(base.numComps);
  }

  AlternateCS.prototype = {
    getRgb: ColorSpace.prototype.getRgb,
    getRgbItem: function AlternateCS_getRgbItem(src, srcOffset,
                                                dest, destOffset) {
      var tmpBuf = this.tmpBuf;
      this.tintFn(src, srcOffset, tmpBuf, 0);
      this.base.getRgbItem(tmpBuf, 0, dest, destOffset);
    },
    getRgbBuffer: function AlternateCS_getRgbBuffer(src, srcOffset, count,
                                                    dest, destOffset, bits,
                                                    alpha01) {
      var tintFn = this.tintFn;
      var base = this.base;
      var scale = 1 / ((1 << bits) - 1);
      var baseNumComps = base.numComps;
      var usesZeroToOneRange = base.usesZeroToOneRange;
      var isPassthrough = (base.isPassthrough(8) || !usesZeroToOneRange) &&
                          alpha01 === 0;
      var pos = isPassthrough ? destOffset : 0;
      var baseBuf = isPassthrough ? dest : new Uint8Array(baseNumComps * count);
      var numComps = this.numComps;

      var scaled = new Float32Array(numComps);
      var tinted = new Float32Array(baseNumComps);
      var i, j;
      if (usesZeroToOneRange) {
        for (i = 0; i < count; i++) {
          for (j = 0; j < numComps; j++) {
            scaled[j] = src[srcOffset++] * scale;
          }
          tintFn(scaled, 0, tinted, 0);
          for (j = 0; j < baseNumComps; j++) {
            baseBuf[pos++] = tinted[j] * 255;
          }
        }
      } else {
        for (i = 0; i < count; i++) {
          for (j = 0; j < numComps; j++) {
            scaled[j] = src[srcOffset++] * scale;
          }
          tintFn(scaled, 0, tinted, 0);
          base.getRgbItem(tinted, 0, baseBuf, pos);
          pos += baseNumComps;
        }
      }
      if (!isPassthrough) {
        base.getRgbBuffer(baseBuf, 0, count, dest, destOffset, 8, alpha01);
      }
    },
    getOutputLength: function AlternateCS_getOutputLength(inputLength,
                                                          alpha01) {
      return this.base.getOutputLength(inputLength *
                                       this.base.numComps / this.numComps,
                                       alpha01);
    },
    isPassthrough: ColorSpace.prototype.isPassthrough,
    fillRgb: ColorSpace.prototype.fillRgb,
    isDefaultDecode: function AlternateCS_isDefaultDecode(decodeMap) {
      return ColorSpace.isDefaultDecode(decodeMap, this.numComps);
    },
    usesZeroToOneRange: true
  };

  return AlternateCS;
})();

var PatternCS = (function PatternCSClosure() {
  function PatternCS(baseCS) {
    this.name = 'Pattern';
    this.base = baseCS;
  }
  PatternCS.prototype = {};

  return PatternCS;
})();

var IndexedCS = (function IndexedCSClosure() {
  function IndexedCS(base, highVal, lookup) {
    this.name = 'Indexed';
    this.numComps = 1;
    this.defaultColor = new Uint8Array([0]);
    this.base = base;
    this.highVal = highVal;

    var baseNumComps = base.numComps;
    var length = baseNumComps * highVal;
    var lookupArray;

    if (isStream(lookup)) {
      lookupArray = new Uint8Array(length);
      var bytes = lookup.getBytes(length);
      lookupArray.set(bytes);
    } else if (isString(lookup)) {
      lookupArray = new Uint8Array(length);
      for (var i = 0; i < length; ++i) {
        lookupArray[i] = lookup.charCodeAt(i);
      }
    } else if (lookup instanceof Uint8Array || lookup instanceof Array) {
      lookupArray = lookup;
    } else {
      error('Unrecognized lookup table: ' + lookup);
    }
    this.lookup = lookupArray;
  }

  IndexedCS.prototype = {
    getRgb: ColorSpace.prototype.getRgb,
    getRgbItem: function IndexedCS_getRgbItem(src, srcOffset,
                                              dest, destOffset) {
      var numComps = this.base.numComps;
      var start = src[srcOffset] * numComps;
      this.base.getRgbItem(this.lookup, start, dest, destOffset);
    },
    getRgbBuffer: function IndexedCS_getRgbBuffer(src, srcOffset, count,
                                                  dest, destOffset, bits,
                                                  alpha01) {
      var base = this.base;
      var numComps = base.numComps;
      var outputDelta = base.getOutputLength(numComps, alpha01);
      var lookup = this.lookup;

      for (var i = 0; i < count; ++i) {
        var lookupPos = src[srcOffset++] * numComps;
        base.getRgbBuffer(lookup, lookupPos, 1, dest, destOffset, 8, alpha01);
        destOffset += outputDelta;
      }
    },
    getOutputLength: function IndexedCS_getOutputLength(inputLength, alpha01) {
      return this.base.getOutputLength(inputLength * this.base.numComps,
                                       alpha01);
    },
    isPassthrough: ColorSpace.prototype.isPassthrough,
    fillRgb: ColorSpace.prototype.fillRgb,
    isDefaultDecode: function IndexedCS_isDefaultDecode(decodeMap) {
      // indexed color maps shouldn't be changed
      return true;
    },
    usesZeroToOneRange: true
  };
  return IndexedCS;
})();

var DeviceGrayCS = (function DeviceGrayCSClosure() {
  function DeviceGrayCS() {
    this.name = 'DeviceGray';
    this.numComps = 1;
    this.defaultColor = new Float32Array([0]);
  }

  DeviceGrayCS.prototype = {
    getRgb: ColorSpace.prototype.getRgb,
    getRgbItem: function DeviceGrayCS_getRgbItem(src, srcOffset,
                                                 dest, destOffset) {
      var c = (src[srcOffset] * 255) | 0;
      c = c < 0 ? 0 : c > 255 ? 255 : c;
      dest[destOffset] = dest[destOffset + 1] = dest[destOffset + 2] = c;
    },
    getRgbBuffer: function DeviceGrayCS_getRgbBuffer(src, srcOffset, count,
                                                     dest, destOffset, bits,
                                                     alpha01) {
      var scale = 255 / ((1 << bits) - 1);
      var j = srcOffset, q = destOffset;
      for (var i = 0; i < count; ++i) {
        var c = (scale * src[j++]) | 0;
        dest[q++] = c;
        dest[q++] = c;
        dest[q++] = c;
        q += alpha01;
      }
    },
    getOutputLength: function DeviceGrayCS_getOutputLength(inputLength,
                                                           alpha01) {
      return inputLength * (3 + alpha01);
    },
    isPassthrough: ColorSpace.prototype.isPassthrough,
    fillRgb: ColorSpace.prototype.fillRgb,
    isDefaultDecode: function DeviceGrayCS_isDefaultDecode(decodeMap) {
      return ColorSpace.isDefaultDecode(decodeMap, this.numComps);
    },
    usesZeroToOneRange: true
  };
  return DeviceGrayCS;
})();

var DeviceRgbCS = (function DeviceRgbCSClosure() {
  function DeviceRgbCS() {
    this.name = 'DeviceRGB';
    this.numComps = 3;
    this.defaultColor = new Float32Array([0, 0, 0]);
  }
  DeviceRgbCS.prototype = {
    getRgb: ColorSpace.prototype.getRgb,
    getRgbItem: function DeviceRgbCS_getRgbItem(src, srcOffset,
                                                dest, destOffset) {
      var r = (src[srcOffset] * 255) | 0;
      var g = (src[srcOffset + 1] * 255) | 0;
      var b = (src[srcOffset + 2] * 255) | 0;
      dest[destOffset] = r < 0 ? 0 : r > 255 ? 255 : r;
      dest[destOffset + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
      dest[destOffset + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    },
    getRgbBuffer: function DeviceRgbCS_getRgbBuffer(src, srcOffset, count,
                                                    dest, destOffset, bits,
                                                    alpha01) {
      if (bits === 8 && alpha01 === 0) {
        dest.set(src.subarray(srcOffset, srcOffset + count * 3), destOffset);
        return;
      }
      var scale = 255 / ((1 << bits) - 1);
      var j = srcOffset, q = destOffset;
      for (var i = 0; i < count; ++i) {
        dest[q++] = (scale * src[j++]) | 0;
        dest[q++] = (scale * src[j++]) | 0;
        dest[q++] = (scale * src[j++]) | 0;
        q += alpha01;
      }
    },
    getOutputLength: function DeviceRgbCS_getOutputLength(inputLength,
                                                          alpha01) {
      return (inputLength * (3 + alpha01) / 3) | 0;
    },
    isPassthrough: function DeviceRgbCS_isPassthrough(bits) {
      return bits === 8;
    },
    fillRgb: ColorSpace.prototype.fillRgb,
    isDefaultDecode: function DeviceRgbCS_isDefaultDecode(decodeMap) {
      return ColorSpace.isDefaultDecode(decodeMap, this.numComps);
    },
    usesZeroToOneRange: true
  };
  return DeviceRgbCS;
})();

var DeviceCmykCS = (function DeviceCmykCSClosure() {
  // The coefficients below was found using numerical analysis: the method of
  // steepest descent for the sum((f_i - color_value_i)^2) for r/g/b colors,
  // where color_value is the tabular value from the table of sampled RGB colors
  // from CMYK US Web Coated (SWOP) colorspace, and f_i is the corresponding
  // CMYK color conversion using the estimation below:
  //   f(A, B,.. N) = Acc+Bcm+Ccy+Dck+c+Fmm+Gmy+Hmk+Im+Jyy+Kyk+Ly+Mkk+Nk+255
  function convertToRgb(src, srcOffset, srcScale, dest, destOffset) {
    var c = src[srcOffset + 0] * srcScale;
    var m = src[srcOffset + 1] * srcScale;
    var y = src[srcOffset + 2] * srcScale;
    var k = src[srcOffset + 3] * srcScale;

    var r =
      (c * (-4.387332384609988 * c + 54.48615194189176 * m +
            18.82290502165302 * y + 212.25662451639585 * k +
            -285.2331026137004) +
       m * (1.7149763477362134 * m - 5.6096736904047315 * y +
            -17.873870861415444 * k - 5.497006427196366) +
       y * (-2.5217340131683033 * y - 21.248923337353073 * k +
            17.5119270841813) +
       k * (-21.86122147463605 * k - 189.48180835922747) + 255) | 0;
    var g =
      (c * (8.841041422036149 * c + 60.118027045597366 * m +
            6.871425592049007 * y + 31.159100130055922 * k +
            -79.2970844816548) +
       m * (-15.310361306967817 * m + 17.575251261109482 * y +
            131.35250912493976 * k - 190.9453302588951) +
       y * (4.444339102852739 * y + 9.8632861493405 * k - 24.86741582555878) +
       k * (-20.737325471181034 * k - 187.80453709719578) + 255) | 0;
    var b =
      (c * (0.8842522430003296 * c + 8.078677503112928 * m +
            30.89978309703729 * y - 0.23883238689178934 * k +
            -14.183576799673286) +
       m * (10.49593273432072 * m + 63.02378494754052 * y +
            50.606957656360734 * k - 112.23884253719248) +
       y * (0.03296041114873217 * y + 115.60384449646641 * k +
            -193.58209356861505) +
       k * (-22.33816807309886 * k - 180.12613974708367) + 255) | 0;

    dest[destOffset] = r > 255 ? 255 : r < 0 ? 0 : r;
    dest[destOffset + 1] = g > 255 ? 255 : g < 0 ? 0 : g;
    dest[destOffset + 2] = b > 255 ? 255 : b < 0 ? 0 : b;
  }

  function DeviceCmykCS() {
    this.name = 'DeviceCMYK';
    this.numComps = 4;
    this.defaultColor = new Float32Array([0, 0, 0, 1]);
  }
  DeviceCmykCS.prototype = {
    getRgb: ColorSpace.prototype.getRgb,
    getRgbItem: function DeviceCmykCS_getRgbItem(src, srcOffset,
                                                 dest, destOffset) {
      convertToRgb(src, srcOffset, 1, dest, destOffset);
    },
    getRgbBuffer: function DeviceCmykCS_getRgbBuffer(src, srcOffset, count,
                                                     dest, destOffset, bits,
                                                     alpha01) {
      var scale = 1 / ((1 << bits) - 1);
      for (var i = 0; i < count; i++) {
        convertToRgb(src, srcOffset, scale, dest, destOffset);
        srcOffset += 4;
        destOffset += 3 + alpha01;
      }
    },
    getOutputLength: function DeviceCmykCS_getOutputLength(inputLength,
                                                           alpha01) {
      return (inputLength / 4 * (3 + alpha01)) | 0;
    },
    isPassthrough: ColorSpace.prototype.isPassthrough,
    fillRgb: ColorSpace.prototype.fillRgb,
    isDefaultDecode: function DeviceCmykCS_isDefaultDecode(decodeMap) {
      return ColorSpace.isDefaultDecode(decodeMap, this.numComps);
    },
    usesZeroToOneRange: true
  };

  return DeviceCmykCS;
})();

//
// CalGrayCS: Based on "PDF Reference, Sixth Ed", p.245
//
var CalGrayCS = (function CalGrayCSClosure() {
  function CalGrayCS(whitePoint, blackPoint, gamma) {
    this.name = 'CalGray';
    this.numComps = 1;
    this.defaultColor = new Float32Array([0]);

    if (!whitePoint) {
      error('WhitePoint missing - required for color space CalGray');
    }
    blackPoint = blackPoint || [0, 0, 0];
    gamma = gamma || 1;

    // Translate arguments to spec variables.
    this.XW = whitePoint[0];
    this.YW = whitePoint[1];
    this.ZW = whitePoint[2];

    this.XB = blackPoint[0];
    this.YB = blackPoint[1];
    this.ZB = blackPoint[2];

    this.G = gamma;

    // Validate variables as per spec.
    if (this.XW < 0 || this.ZW < 0 || this.YW !== 1) {
      error('Invalid WhitePoint components for ' + this.name +
            ', no fallback available');
    }

    if (this.XB < 0 || this.YB < 0 || this.ZB < 0) {
      info('Invalid BlackPoint for ' + this.name + ', falling back to default');
      this.XB = this.YB = this.ZB = 0;
    }

    if (this.XB !== 0 || this.YB !== 0 || this.ZB !== 0) {
      warn(this.name + ', BlackPoint: XB: ' + this.XB + ', YB: ' + this.YB +
           ', ZB: ' + this.ZB + ', only default values are supported.');
    }

    if (this.G < 1) {
      info('Invalid Gamma: ' + this.G + ' for ' + this.name +
           ', falling back to default');
      this.G = 1;
    }
  }

  function convertToRgb(cs, src, srcOffset, dest, destOffset, scale) {
    // A represents a gray component of a calibrated gray space.
    // A <---> AG in the spec
    var A = src[srcOffset] * scale;
    var AG = Math.pow(A, cs.G);

    // Computes L as per spec. ( = cs.YW * AG )
    // Except if other than default BlackPoint values are used.
    var L = cs.YW * AG;
    // http://www.poynton.com/notes/colour_and_gamma/ColorFAQ.html, Ch 4.
    // Convert values to rgb range [0, 255].
    var val = Math.max(295.8 * Math.pow(L, 0.333333333333333333) - 40.8, 0) | 0;
    dest[destOffset] = val;
    dest[destOffset + 1] = val;
    dest[destOffset + 2] = val;
  }

  CalGrayCS.prototype = {
    getRgb: ColorSpace.prototype.getRgb,
    getRgbItem: function CalGrayCS_getRgbItem(src, srcOffset,
                                              dest, destOffset) {
      convertToRgb(this, src, srcOffset, dest, destOffset, 1);
    },
    getRgbBuffer: function CalGrayCS_getRgbBuffer(src, srcOffset, count,
                                                  dest, destOffset, bits,
                                                  alpha01) {
      var scale = 1 / ((1 << bits) - 1);

      for (var i = 0; i < count; ++i) {
        convertToRgb(this, src, srcOffset, dest, destOffset, scale);
        srcOffset += 1;
        destOffset += 3 + alpha01;
      }
    },
    getOutputLength: function CalGrayCS_getOutputLength(inputLength, alpha01) {
      return inputLength * (3 + alpha01);
    },
    isPassthrough: ColorSpace.prototype.isPassthrough,
    fillRgb: ColorSpace.prototype.fillRgb,
    isDefaultDecode: function CalGrayCS_isDefaultDecode(decodeMap) {
      return ColorSpace.isDefaultDecode(decodeMap, this.numComps);
    },
    usesZeroToOneRange: true
  };
  return CalGrayCS;
})();

//
// CalRGBCS: Based on "PDF Reference, Sixth Ed", p.247
//
var CalRGBCS = (function CalRGBCSClosure() {

  // See http://www.brucelindbloom.com/index.html?Eqn_ChromAdapt.html for these
  // matrices.
  var BRADFORD_SCALE_MATRIX = new Float32Array([
    0.8951, 0.2664, -0.1614,
    -0.7502, 1.7135, 0.0367,
    0.0389, -0.0685, 1.0296]);

  var BRADFORD_SCALE_INVERSE_MATRIX = new Float32Array([
    0.9869929, -0.1470543, 0.1599627,
    0.4323053, 0.5183603, 0.0492912,
    -0.0085287, 0.0400428, 0.9684867]);

  // See http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html.
  var SRGB_D65_XYZ_TO_RGB_MATRIX = new Float32Array([
    3.2404542, -1.5371385, -0.4985314,
    -0.9692660, 1.8760108, 0.0415560,
    0.0556434, -0.2040259, 1.0572252]);

  var FLAT_WHITEPOINT_MATRIX = new Float32Array([1, 1, 1]);

  var tempNormalizeMatrix = new Float32Array(3);
  var tempConvertMatrix1 = new Float32Array(3);
  var tempConvertMatrix2 = new Float32Array(3);

  var DECODE_L_CONSTANT = Math.pow(((8 + 16) / 116), 3) / 8.0;

  function CalRGBCS(whitePoint, blackPoint, gamma, matrix) {
    this.name = 'CalRGB';
    this.numComps = 3;
    this.defaultColor = new Float32Array(3);

    if (!whitePoint) {
      error('WhitePoint missing - required for color space CalRGB');
    }
    blackPoint = blackPoint || new Float32Array(3);
    gamma = gamma || new Float32Array([1, 1, 1]);
    matrix = matrix || new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

    // Translate arguments to spec variables.
    var XW = whitePoint[0];
    var YW = whitePoint[1];
    var ZW = whitePoint[2];
    this.whitePoint = whitePoint;

    var XB = blackPoint[0];
    var YB = blackPoint[1];
    var ZB = blackPoint[2];
    this.blackPoint = blackPoint;

    this.GR = gamma[0];
    this.GG = gamma[1];
    this.GB = gamma[2];

    this.MXA = matrix[0];
    this.MYA = matrix[1];
    this.MZA = matrix[2];
    this.MXB = matrix[3];
    this.MYB = matrix[4];
    this.MZB = matrix[5];
    this.MXC = matrix[6];
    this.MYC = matrix[7];
    this.MZC = matrix[8];

    // Validate variables as per spec.
    if (XW < 0 || ZW < 0 || YW !== 1) {
      error('Invalid WhitePoint components for ' + this.name +
            ', no fallback available');
    }

    if (XB < 0 || YB < 0 || ZB < 0) {
      info('Invalid BlackPoint for ' + this.name + ' [' + XB + ', ' + YB +
           ', ' + ZB + '], falling back to default');
      this.blackPoint = new Float32Array(3);
    }

    if (this.GR < 0 || this.GG < 0 || this.GB < 0) {
      info('Invalid Gamma [' + this.GR + ', ' + this.GG + ', ' + this.GB +
           '] for ' + this.name + ', falling back to default');
      this.GR = this.GG = this.GB = 1;
    }

    if (this.MXA < 0 || this.MYA < 0 || this.MZA < 0 ||
        this.MXB < 0 || this.MYB < 0 || this.MZB < 0 ||
        this.MXC < 0 || this.MYC < 0 || this.MZC < 0) {
      info('Invalid Matrix for ' + this.name + ' [' +
           this.MXA + ', ' + this.MYA + ', ' + this.MZA +
           this.MXB + ', ' + this.MYB + ', ' + this.MZB +
           this.MXC + ', ' + this.MYC + ', ' + this.MZC +
           '], falling back to default');
      this.MXA = this.MYB = this.MZC = 1;
      this.MXB = this.MYA = this.MZA = this.MXC = this.MYC = this.MZB = 0;
    }
  }

  function matrixProduct(a, b, result) {
      result[0] = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      result[1] = a[3] * b[0] + a[4] * b[1] + a[5] * b[2];
      result[2] = a[6] * b[0] + a[7] * b[1] + a[8] * b[2];
  }

  function convertToFlat(sourceWhitePoint, LMS, result) {
      result[0] = LMS[0] * 1 / sourceWhitePoint[0];
      result[1] = LMS[1] * 1 / sourceWhitePoint[1];
      result[2] = LMS[2] * 1 / sourceWhitePoint[2];
  }

  function convertToD65(sourceWhitePoint, LMS, result) {
    var D65X = 0.95047;
    var D65Y = 1;
    var D65Z = 1.08883;

    result[0] = LMS[0] * D65X / sourceWhitePoint[0];
    result[1] = LMS[1] * D65Y / sourceWhitePoint[1];
    result[2] = LMS[2] * D65Z / sourceWhitePoint[2];
  }

  function sRGBTransferFunction(color) {
    // See http://en.wikipedia.org/wiki/SRGB.
    if (color <= 0.0031308){
      return adjustToRange(0, 1, 12.92 * color);
    }

    return adjustToRange(0, 1, (1 + 0.055) * Math.pow(color, 1 / 2.4) - 0.055);
  }

  function adjustToRange(min, max, value) {
    return Math.max(min, Math.min(max, value));
  }

  function decodeL(L) {
    if (L < 0) {
      return -decodeL(-L);
    }

    if (L > 8.0) {
      return Math.pow(((L + 16) / 116), 3);
    }

    return L * DECODE_L_CONSTANT;
  }

  function compensateBlackPoint(sourceBlackPoint, XYZ_Flat, result) {

    // In case the blackPoint is already the default blackPoint then there is
    // no need to do compensation.
    if (sourceBlackPoint[0] === 0 &&
        sourceBlackPoint[1] === 0 &&
        sourceBlackPoint[2] === 0) {
      result[0] = XYZ_Flat[0];
      result[1] = XYZ_Flat[1];
      result[2] = XYZ_Flat[2];
      return;
    }

    // For the blackPoint calculation details, please see
    // http://www.adobe.com/content/dam/Adobe/en/devnet/photoshop/sdk/
    // AdobeBPC.pdf.
    // The destination blackPoint is the default blackPoint [0, 0, 0].
    var zeroDecodeL = decodeL(0);

    var X_DST = zeroDecodeL;
    var X_SRC = decodeL(sourceBlackPoint[0]);

    var Y_DST = zeroDecodeL;
    var Y_SRC = decodeL(sourceBlackPoint[1]);

    var Z_DST = zeroDecodeL;
    var Z_SRC = decodeL(sourceBlackPoint[2]);

    var X_Scale = (1 - X_DST) / (1 - X_SRC);
    var X_Offset = 1 - X_Scale;

    var Y_Scale = (1 - Y_DST) / (1 - Y_SRC);
    var Y_Offset = 1 - Y_Scale;

    var Z_Scale = (1 - Z_DST) / (1 - Z_SRC);
    var Z_Offset = 1 - Z_Scale;

    result[0] = XYZ_Flat[0] * X_Scale + X_Offset;
    result[1] = XYZ_Flat[1] * Y_Scale + Y_Offset;
    result[2] = XYZ_Flat[2] * Z_Scale + Z_Offset;
  }

  function normalizeWhitePointToFlat(sourceWhitePoint, XYZ_In, result) {

    // In case the whitePoint is already flat then there is no need to do
    // normalization.
    if (sourceWhitePoint[0] === 1 && sourceWhitePoint[2] === 1) {
      result[0] = XYZ_In[0];
      result[1] = XYZ_In[1];
      result[2] = XYZ_In[2];
      return;
    }

    var LMS = result;
    matrixProduct(BRADFORD_SCALE_MATRIX, XYZ_In, LMS);

    var LMS_Flat = tempNormalizeMatrix;
    convertToFlat(sourceWhitePoint, LMS, LMS_Flat);

    matrixProduct(BRADFORD_SCALE_INVERSE_MATRIX, LMS_Flat, result);
  }

  function normalizeWhitePointToD65(sourceWhitePoint, XYZ_In, result) {

    var LMS = result;
    matrixProduct(BRADFORD_SCALE_MATRIX, XYZ_In, LMS);

    var LMS_D65 = tempNormalizeMatrix;
    convertToD65(sourceWhitePoint, LMS, LMS_D65);

    matrixProduct(BRADFORD_SCALE_INVERSE_MATRIX, LMS_D65, result);
  }

  function convertToRgb(cs, src, srcOffset, dest, destOffset, scale) {
    // A, B and C represent a red, green and blue components of a calibrated
    // rgb space.
    var A = adjustToRange(0, 1, src[srcOffset] * scale);
    var B = adjustToRange(0, 1, src[srcOffset + 1] * scale);
    var C = adjustToRange(0, 1, src[srcOffset + 2] * scale);

    // A <---> AGR in the spec
    // B <---> BGG in the spec
    // C <---> CGB in the spec
    var AGR = Math.pow(A, cs.GR);
    var BGG = Math.pow(B, cs.GG);
    var CGB = Math.pow(C, cs.GB);

    // Computes intermediate variables L, M, N as per spec.
    // To decode X, Y, Z values map L, M, N directly to them.
    var X = cs.MXA * AGR + cs.MXB * BGG + cs.MXC * CGB;
    var Y = cs.MYA * AGR + cs.MYB * BGG + cs.MYC * CGB;
    var Z = cs.MZA * AGR + cs.MZB * BGG + cs.MZC * CGB;

    // The following calculations are based on this document:
    // http://www.adobe.com/content/dam/Adobe/en/devnet/photoshop/sdk/
    // AdobeBPC.pdf.
    var XYZ = tempConvertMatrix1;
    XYZ[0] = X;
    XYZ[1] = Y;
    XYZ[2] = Z;
    var XYZ_Flat = tempConvertMatrix2;

    normalizeWhitePointToFlat(cs.whitePoint, XYZ, XYZ_Flat);

    var XYZ_Black = tempConvertMatrix1;
    compensateBlackPoint(cs.blackPoint, XYZ_Flat, XYZ_Black);

    var XYZ_D65 = tempConvertMatrix2;
    normalizeWhitePointToD65(FLAT_WHITEPOINT_MATRIX, XYZ_Black, XYZ_D65);

    var SRGB = tempConvertMatrix1;
    matrixProduct(SRGB_D65_XYZ_TO_RGB_MATRIX, XYZ_D65, SRGB);

    var sR = sRGBTransferFunction(SRGB[0]);
    var sG = sRGBTransferFunction(SRGB[1]);
    var sB = sRGBTransferFunction(SRGB[2]);

    // Convert the values to rgb range [0, 255].
    dest[destOffset] = Math.round(sR * 255);
    dest[destOffset + 1] = Math.round(sG * 255);
    dest[destOffset + 2] = Math.round(sB * 255);
  }

  CalRGBCS.prototype = {
    getRgb: function CalRGBCS_getRgb(src, srcOffset) {
      var rgb = new Uint8Array(3);
      this.getRgbItem(src, srcOffset, rgb, 0);
      return rgb;
    },
    getRgbItem: function CalRGBCS_getRgbItem(src, srcOffset,
                                             dest, destOffset) {
      convertToRgb(this, src, srcOffset, dest, destOffset, 1);
    },
    getRgbBuffer: function CalRGBCS_getRgbBuffer(src, srcOffset, count,
                                                 dest, destOffset, bits,
                                                 alpha01) {
      var scale = 1 / ((1 << bits) - 1);

      for (var i = 0; i < count; ++i) {
        convertToRgb(this, src, srcOffset, dest, destOffset, scale);
        srcOffset += 3;
        destOffset += 3 + alpha01;
      }
    },
    getOutputLength: function CalRGBCS_getOutputLength(inputLength, alpha01) {
      return (inputLength * (3 + alpha01) / 3) | 0;
    },
    isPassthrough: ColorSpace.prototype.isPassthrough,
    fillRgb: ColorSpace.prototype.fillRgb,
    isDefaultDecode: function CalRGBCS_isDefaultDecode(decodeMap) {
      return ColorSpace.isDefaultDecode(decodeMap, this.numComps);
    },
    usesZeroToOneRange: true
  };
  return CalRGBCS;
})();

//
// LabCS: Based on "PDF Reference, Sixth Ed", p.250
//
var LabCS = (function LabCSClosure() {
  function LabCS(whitePoint, blackPoint, range) {
    this.name = 'Lab';
    this.numComps = 3;
    this.defaultColor = new Float32Array([0, 0, 0]);

    if (!whitePoint) {
      error('WhitePoint missing - required for color space Lab');
    }
    blackPoint = blackPoint || [0, 0, 0];
    range = range || [-100, 100, -100, 100];

    // Translate args to spec variables
    this.XW = whitePoint[0];
    this.YW = whitePoint[1];
    this.ZW = whitePoint[2];
    this.amin = range[0];
    this.amax = range[1];
    this.bmin = range[2];
    this.bmax = range[3];

    // These are here just for completeness - the spec doesn't offer any
    // formulas that use BlackPoint in Lab
    this.XB = blackPoint[0];
    this.YB = blackPoint[1];
    this.ZB = blackPoint[2];

    // Validate vars as per spec
    if (this.XW < 0 || this.ZW < 0 || this.YW !== 1) {
      error('Invalid WhitePoint components, no fallback available');
    }

    if (this.XB < 0 || this.YB < 0 || this.ZB < 0) {
      info('Invalid BlackPoint, falling back to default');
      this.XB = this.YB = this.ZB = 0;
    }

    if (this.amin > this.amax || this.bmin > this.bmax) {
      info('Invalid Range, falling back to defaults');
      this.amin = -100;
      this.amax = 100;
      this.bmin = -100;
      this.bmax = 100;
    }
  }

  // Function g(x) from spec
  function fn_g(x) {
    if (x >= 6 / 29) {
      return x * x * x;
    } else {
      return (108 / 841) * (x - 4 / 29);
    }
  }

  function decode(value, high1, low2, high2) {
    return low2 + (value) * (high2 - low2) / (high1);
  }

  // If decoding is needed maxVal should be 2^bits per component - 1.
  function convertToRgb(cs, src, srcOffset, maxVal, dest, destOffset) {
    // XXX: Lab input is in the range of [0, 100], [amin, amax], [bmin, bmax]
    // not the usual [0, 1]. If a command like setFillColor is used the src
    // values will already be within the correct range. However, if we are
    // converting an image we have to map the values to the correct range given
    // above.
    // Ls,as,bs <---> L*,a*,b* in the spec
    var Ls = src[srcOffset];
    var as = src[srcOffset + 1];
    var bs = src[srcOffset + 2];
    if (maxVal !== false) {
      Ls = decode(Ls, maxVal, 0, 100);
      as = decode(as, maxVal, cs.amin, cs.amax);
      bs = decode(bs, maxVal, cs.bmin, cs.bmax);
    }

    // Adjust limits of 'as' and 'bs'
    as = as > cs.amax ? cs.amax : as < cs.amin ? cs.amin : as;
    bs = bs > cs.bmax ? cs.bmax : bs < cs.bmin ? cs.bmin : bs;

    // Computes intermediate variables X,Y,Z as per spec
    var M = (Ls + 16) / 116;
    var L = M + (as / 500);
    var N = M - (bs / 200);

    var X = cs.XW * fn_g(L);
    var Y = cs.YW * fn_g(M);
    var Z = cs.ZW * fn_g(N);

    var r, g, b;
    // Using different conversions for D50 and D65 white points,
    // per http://www.color.org/srgb.pdf
    if (cs.ZW < 1) {
      // Assuming D50 (X=0.9642, Y=1.00, Z=0.8249)
      r = X * 3.1339 + Y * -1.6170 + Z * -0.4906;
      g = X * -0.9785 + Y * 1.9160 + Z * 0.0333;
      b = X * 0.0720 + Y * -0.2290 + Z * 1.4057;
    } else {
      // Assuming D65 (X=0.9505, Y=1.00, Z=1.0888)
      r = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
      g = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
      b = X * 0.0557 + Y * -0.2040 + Z * 1.0570;
    }
    // clamp color values to [0,1] range then convert to [0,255] range.
    dest[destOffset] = r <= 0 ? 0 : r >= 1 ? 255 : Math.sqrt(r) * 255 | 0;
    dest[destOffset + 1] = g <= 0 ? 0 : g >= 1 ? 255 : Math.sqrt(g) * 255 | 0;
    dest[destOffset + 2] = b <= 0 ? 0 : b >= 1 ? 255 : Math.sqrt(b) * 255 | 0;
  }

  LabCS.prototype = {
    getRgb: ColorSpace.prototype.getRgb,
    getRgbItem: function LabCS_getRgbItem(src, srcOffset, dest, destOffset) {
      convertToRgb(this, src, srcOffset, false, dest, destOffset);
    },
    getRgbBuffer: function LabCS_getRgbBuffer(src, srcOffset, count,
                                              dest, destOffset, bits,
                                              alpha01) {
      var maxVal = (1 << bits) - 1;
      for (var i = 0; i < count; i++) {
        convertToRgb(this, src, srcOffset, maxVal, dest, destOffset);
        srcOffset += 3;
        destOffset += 3 + alpha01;
      }
    },
    getOutputLength: function LabCS_getOutputLength(inputLength, alpha01) {
      return (inputLength * (3 + alpha01) / 3) | 0;
    },
    isPassthrough: ColorSpace.prototype.isPassthrough,
    fillRgb: ColorSpace.prototype.fillRgb,
    isDefaultDecode: function LabCS_isDefaultDecode(decodeMap) {
      // XXX: Decoding is handled with the lab conversion because of the strange
      // ranges that are used.
      return true;
    },
    usesZeroToOneRange: false
  };
  return LabCS;
})();

exports.ColorSpace = ColorSpace;
}));


(function (root, factory) {
  {
    factory((root.pdfjsCoreImage = {}), root.pdfjsSharedUtil,
      root.pdfjsCorePrimitives, root.pdfjsCoreColorSpace, root.pdfjsCoreStream,
      root.pdfjsCoreJpx);
  }
}(this, function (exports, sharedUtil, corePrimitives, coreColorSpace,
                  coreStream, coreJpx) {

var ImageKind = sharedUtil.ImageKind;
var assert = sharedUtil.assert;
var error = sharedUtil.error;
var info = sharedUtil.info;
var isArray = sharedUtil.isArray;
var warn = sharedUtil.warn;
var Name = corePrimitives.Name;
var isStream = corePrimitives.isStream;
var ColorSpace = coreColorSpace.ColorSpace;
var DecodeStream = coreStream.DecodeStream;
var JpegStream = coreStream.JpegStream;
var JpxImage = coreJpx.JpxImage;

var PDFImage = (function PDFImageClosure() {
  /**
   * Decodes the image using native decoder if possible. Resolves the promise
   * when the image data is ready.
   */
  function handleImageData(image, nativeDecoder) {
    if (nativeDecoder && nativeDecoder.canDecode(image)) {
      return nativeDecoder.decode(image);
    } else {
      return Promise.resolve(image);
    }
  }

  /**
   * Decode and clamp a value. The formula is different from the spec because we
   * don't decode to float range [0,1], we decode it in the [0,max] range.
   */
  function decodeAndClamp(value, addend, coefficient, max) {
    value = addend + value * coefficient;
    // Clamp the value to the range
    return (value < 0 ? 0 : (value > max ? max : value));
  }

  /**
   * Resizes an image mask with 1 component.
   * @param {TypedArray} src - The source buffer.
   * @param {Number} bpc - Number of bits per component.
   * @param {Number} w1 - Original width.
   * @param {Number} h1 - Original height.
   * @param {Number} w2 - New width.
   * @param {Number} h2 - New height.
   * @returns {TypedArray} The resized image mask buffer.
   */
  function resizeImageMask(src, bpc, w1, h1, w2, h2) {
    var length = w2 * h2;
    var dest = (bpc <= 8 ? new Uint8Array(length) :
      (bpc <= 16 ? new Uint16Array(length) : new Uint32Array(length)));
    var xRatio = w1 / w2;
    var yRatio = h1 / h2;
    var i, j, py, newIndex = 0, oldIndex;
    var xScaled = new Uint16Array(w2);
    var w1Scanline = w1;

    for (i = 0; i < w2; i++) {
      xScaled[i] = Math.floor(i * xRatio);
    }
    for (i = 0; i < h2; i++) {
      py = Math.floor(i * yRatio) * w1Scanline;
      for (j = 0; j < w2; j++) {
        oldIndex = py + xScaled[j];
        dest[newIndex++] = src[oldIndex];
      }
    }
    return dest;
  }

  function PDFImage(xref, res, image, inline, smask, mask, isMask) {
    this.image = image;
    var dict = image.dict;
    if (dict.has('Filter')) {
      var filter = dict.get('Filter').name;
      if (filter === 'JPXDecode') {
        var jpxImage = new JpxImage();
        jpxImage.parseImageProperties(image.stream);
        image.stream.reset();
        image.bitsPerComponent = jpxImage.bitsPerComponent;
        image.numComps = jpxImage.componentsCount;
      } else if (filter === 'JBIG2Decode') {
        image.bitsPerComponent = 1;
        image.numComps = 1;
      }
    }
    // TODO cache rendered images?

    this.width = dict.get('Width', 'W');
    this.height = dict.get('Height', 'H');

    if (this.width < 1 || this.height < 1) {
      error('Invalid image width: ' + this.width + ' or height: ' +
            this.height);
    }

    this.interpolate = dict.get('Interpolate', 'I') || false;
    this.imageMask = dict.get('ImageMask', 'IM') || false;
    this.matte = dict.get('Matte') || false;

    var bitsPerComponent = image.bitsPerComponent;
    if (!bitsPerComponent) {
      bitsPerComponent = dict.get('BitsPerComponent', 'BPC');
      if (!bitsPerComponent) {
        if (this.imageMask) {
          bitsPerComponent = 1;
        } else {
          error('Bits per component missing in image: ' + this.imageMask);
        }
      }
    }
    this.bpc = bitsPerComponent;

    if (!this.imageMask) {
      var colorSpace = dict.get('ColorSpace', 'CS');
      if (!colorSpace) {
        info('JPX images (which do not require color spaces)');
        switch (image.numComps) {
          case 1:
            colorSpace = Name.get('DeviceGray');
            break;
          case 3:
            colorSpace = Name.get('DeviceRGB');
            break;
          case 4:
            colorSpace = Name.get('DeviceCMYK');
            break;
          default:
            error('JPX images with ' + this.numComps +
                  ' color components not supported.');
        }
      }
      this.colorSpace = ColorSpace.parse(colorSpace, xref, res);
      this.numComps = this.colorSpace.numComps;
    }

    this.decode = dict.get('Decode', 'D');
    this.needsDecode = false;
    if (this.decode &&
        ((this.colorSpace && !this.colorSpace.isDefaultDecode(this.decode)) ||
         (isMask && !ColorSpace.isDefaultDecode(this.decode, 1)))) {
      this.needsDecode = true;
      // Do some preprocessing to avoid more math.
      var max = (1 << bitsPerComponent) - 1;
      this.decodeCoefficients = [];
      this.decodeAddends = [];
      for (var i = 0, j = 0; i < this.decode.length; i += 2, ++j) {
        var dmin = this.decode[i];
        var dmax = this.decode[i + 1];
        this.decodeCoefficients[j] = dmax - dmin;
        this.decodeAddends[j] = max * dmin;
      }
    }

    if (smask) {
      this.smask = new PDFImage(xref, res, smask, false);
    } else if (mask) {
      if (isStream(mask)) {
        var maskDict = mask.dict, imageMask = maskDict.get('ImageMask', 'IM');
        if (!imageMask) {
          warn('Ignoring /Mask in image without /ImageMask.');
        } else {
          this.mask = new PDFImage(xref, res, mask, false, null, null, true);
        }
      } else {
        // Color key mask (just an array).
        this.mask = mask;
      }
    }
  }
  /**
   * Handles processing of image data and returns the Promise that is resolved
   * with a PDFImage when the image is ready to be used.
   */
  PDFImage.buildImage = function PDFImage_buildImage(handler, xref,
                                                     res, image, inline,
                                                     nativeDecoder) {
    var imagePromise = handleImageData(image, nativeDecoder);
    var smaskPromise;
    var maskPromise;

    var smask = image.dict.get('SMask');
    var mask = image.dict.get('Mask');

    if (smask) {
      smaskPromise = handleImageData(smask, nativeDecoder);
      maskPromise = Promise.resolve(null);
    } else {
      smaskPromise = Promise.resolve(null);
      if (mask) {
        if (isStream(mask)) {
          maskPromise = handleImageData(mask, nativeDecoder);
        } else if (isArray(mask)) {
          maskPromise = Promise.resolve(mask);
        } else {
          warn('Unsupported mask format.');
          maskPromise = Promise.resolve(null);
        }
      } else {
        maskPromise = Promise.resolve(null);
      }
    }
    return Promise.all([imagePromise, smaskPromise, maskPromise]).then(
      function(results) {
        var imageData = results[0];
        var smaskData = results[1];
        var maskData = results[2];
        return new PDFImage(xref, res, imageData, inline, smaskData, maskData);
      });
  };

  PDFImage.createMask =
      function PDFImage_createMask(imgArray, width, height,
                                   imageIsFromDecodeStream, inverseDecode) {

    // |imgArray| might not contain full data for every pixel of the mask, so
    // we need to distinguish between |computedLength| and |actualLength|.
    // In particular, if inverseDecode is true, then the array we return must
    // have a length of |computedLength|.

    var computedLength = ((width + 7) >> 3) * height;
    var actualLength = imgArray.byteLength;
    var haveFullData = computedLength === actualLength;
    var data, i;

    if (imageIsFromDecodeStream && (!inverseDecode || haveFullData)) {
      // imgArray came from a DecodeStream and its data is in an appropriate
      // form, so we can just transfer it.
      data = imgArray;
    } else if (!inverseDecode) {
      data = new Uint8Array(actualLength);
      data.set(imgArray);
    } else {
      data = new Uint8Array(computedLength);
      data.set(imgArray);
      for (i = actualLength; i < computedLength; i++) {
        data[i] = 0xff;
      }
    }

    // If necessary, invert the original mask data (but not any extra we might
    // have added above). It's safe to modify the array -- whether it's the
    // original or a copy, we're about to transfer it anyway, so nothing else
    // in this thread can be relying on its contents.
    if (inverseDecode) {
      for (i = 0; i < actualLength; i++) {
        data[i] = ~data[i];
      }
    }

    return {data: data, width: width, height: height};
  };

  PDFImage.prototype = {
    get drawWidth() {
      return Math.max(this.width,
                      this.smask && this.smask.width || 0,
                      this.mask && this.mask.width || 0);
    },

    get drawHeight() {
      return Math.max(this.height,
                      this.smask && this.smask.height || 0,
                      this.mask && this.mask.height || 0);
    },

    decodeBuffer: function PDFImage_decodeBuffer(buffer) {
      var bpc = this.bpc;
      var numComps = this.numComps;

      var decodeAddends = this.decodeAddends;
      var decodeCoefficients = this.decodeCoefficients;
      var max = (1 << bpc) - 1;
      var i, ii;

      if (bpc === 1) {
        // If the buffer needed decode that means it just needs to be inverted.
        for (i = 0, ii = buffer.length; i < ii; i++) {
          buffer[i] = +!(buffer[i]);
        }
        return;
      }
      var index = 0;
      for (i = 0, ii = this.width * this.height; i < ii; i++) {
        for (var j = 0; j < numComps; j++) {
          buffer[index] = decodeAndClamp(buffer[index], decodeAddends[j],
                                         decodeCoefficients[j], max);
          index++;
        }
      }
    },

    getComponents: function PDFImage_getComponents(buffer) {
      var bpc = this.bpc;

      // This image doesn't require any extra work.
      if (bpc === 8) {
        return buffer;
      }

      var width = this.width;
      var height = this.height;
      var numComps = this.numComps;

      var length = width * height * numComps;
      var bufferPos = 0;
      var output = (bpc <= 8 ? new Uint8Array(length) :
        (bpc <= 16 ? new Uint16Array(length) : new Uint32Array(length)));
      var rowComps = width * numComps;

      var max = (1 << bpc) - 1;
      var i = 0, ii, buf;

      if (bpc === 1) {
        // Optimization for reading 1 bpc images.
        var mask, loop1End, loop2End;
        for (var j = 0; j < height; j++) {
          loop1End = i + (rowComps & ~7);
          loop2End = i + rowComps;

          // unroll loop for all full bytes
          while (i < loop1End) {
            buf = buffer[bufferPos++];
            output[i] = (buf >> 7) & 1;
            output[i + 1] = (buf >> 6) & 1;
            output[i + 2] = (buf >> 5) & 1;
            output[i + 3] = (buf >> 4) & 1;
            output[i + 4] = (buf >> 3) & 1;
            output[i + 5] = (buf >> 2) & 1;
            output[i + 6] = (buf >> 1) & 1;
            output[i + 7] = buf & 1;
            i += 8;
          }

          // handle remaing bits
          if (i < loop2End) {
            buf = buffer[bufferPos++];
            mask = 128;
            while (i < loop2End) {
              output[i++] = +!!(buf & mask);
              mask >>= 1;
            }
          }
        }
      } else {
        // The general case that handles all other bpc values.
        var bits = 0;
        buf = 0;
        for (i = 0, ii = length; i < ii; ++i) {
          if (i % rowComps === 0) {
            buf = 0;
            bits = 0;
          }

          while (bits < bpc) {
            buf = (buf << 8) | buffer[bufferPos++];
            bits += 8;
          }

          var remainingBits = bits - bpc;
          var value = buf >> remainingBits;
          output[i] = (value < 0 ? 0 : (value > max ? max : value));
          buf = buf & ((1 << remainingBits) - 1);
          bits = remainingBits;
        }
      }
      return output;
    },

    fillOpacity: function PDFImage_fillOpacity(rgbaBuf, width, height,
                                               actualHeight, image) {
      var smask = this.smask;
      var mask = this.mask;
      var alphaBuf, sw, sh, i, ii, j;

      if (smask) {
        sw = smask.width;
        sh = smask.height;
        alphaBuf = new Uint8Array(sw * sh);
        smask.fillGrayBuffer(alphaBuf);
        if (sw !== width || sh !== height) {
          alphaBuf = resizeImageMask(alphaBuf, smask.bpc, sw, sh,
                                     width, height);
        }
      } else if (mask) {
        if (mask instanceof PDFImage) {
          sw = mask.width;
          sh = mask.height;
          alphaBuf = new Uint8Array(sw * sh);
          mask.numComps = 1;
          mask.fillGrayBuffer(alphaBuf);

          // Need to invert values in rgbaBuf
          for (i = 0, ii = sw * sh; i < ii; ++i) {
            alphaBuf[i] = 255 - alphaBuf[i];
          }

          if (sw !== width || sh !== height) {
            alphaBuf = resizeImageMask(alphaBuf, mask.bpc, sw, sh,
                                       width, height);
          }
        } else if (isArray(mask)) {
          // Color key mask: if any of the compontents are outside the range
          // then they should be painted.
          alphaBuf = new Uint8Array(width * height);
          var numComps = this.numComps;
          for (i = 0, ii = width * height; i < ii; ++i) {
            var opacity = 0;
            var imageOffset = i * numComps;
            for (j = 0; j < numComps; ++j) {
              var color = image[imageOffset + j];
              var maskOffset = j * 2;
              if (color < mask[maskOffset] || color > mask[maskOffset + 1]) {
                opacity = 255;
                break;
              }
            }
            alphaBuf[i] = opacity;
          }
        } else {
          error('Unknown mask format.');
        }
      }

      if (alphaBuf) {
        for (i = 0, j = 3, ii = width * actualHeight; i < ii; ++i, j += 4) {
          rgbaBuf[j] = alphaBuf[i];
        }
      } else {
        // No mask.
        for (i = 0, j = 3, ii = width * actualHeight; i < ii; ++i, j += 4) {
          rgbaBuf[j] = 255;
        }
      }
    },

    undoPreblend: function PDFImage_undoPreblend(buffer, width, height) {
      var matte = this.smask && this.smask.matte;
      if (!matte) {
        return;
      }
      var matteRgb = this.colorSpace.getRgb(matte, 0);
      var matteR = matteRgb[0];
      var matteG = matteRgb[1];
      var matteB = matteRgb[2];
      var length = width * height * 4;
      var r, g, b;
      for (var i = 0; i < length; i += 4) {
        var alpha = buffer[i + 3];
        if (alpha === 0) {
          // according formula we have to get Infinity in all components
          // making it white (typical paper color) should be okay
          buffer[i] = 255;
          buffer[i + 1] = 255;
          buffer[i + 2] = 255;
          continue;
        }
        var k = 255 / alpha;
        r = (buffer[i] - matteR) * k + matteR;
        g = (buffer[i + 1] - matteG) * k + matteG;
        b = (buffer[i + 2] - matteB) * k + matteB;
        buffer[i] = r <= 0 ? 0 : r >= 255 ? 255 : r | 0;
        buffer[i + 1] = g <= 0 ? 0 : g >= 255 ? 255 : g | 0;
        buffer[i + 2] = b <= 0 ? 0 : b >= 255 ? 255 : b | 0;
      }
    },

    createImageData: function PDFImage_createImageData(forceRGBA) {
      var drawWidth = this.drawWidth;
      var drawHeight = this.drawHeight;
      var imgData = { // other fields are filled in below
        width: drawWidth,
        height: drawHeight
      };

      var numComps = this.numComps;
      var originalWidth = this.width;
      var originalHeight = this.height;
      var bpc = this.bpc;

      // Rows start at byte boundary.
      var rowBytes = (originalWidth * numComps * bpc + 7) >> 3;
      var imgArray;

      if (!forceRGBA) {
        // If it is a 1-bit-per-pixel grayscale (i.e. black-and-white) image
        // without any complications, we pass a same-sized copy to the main
        // thread rather than expanding by 32x to RGBA form. This saves *lots*
        // of memory for many scanned documents. It's also much faster.
        //
        // Similarly, if it is a 24-bit-per pixel RGB image without any
        // complications, we avoid expanding by 1.333x to RGBA form.
        var kind;
        if (this.colorSpace.name === 'DeviceGray' && bpc === 1) {
          kind = ImageKind.GRAYSCALE_1BPP;
        } else if (this.colorSpace.name === 'DeviceRGB' && bpc === 8 &&
                   !this.needsDecode) {
          kind = ImageKind.RGB_24BPP;
        }
        if (kind && !this.smask && !this.mask &&
            drawWidth === originalWidth && drawHeight === originalHeight) {
          imgData.kind = kind;

          imgArray = this.getImageBytes(originalHeight * rowBytes);
          // If imgArray came from a DecodeStream, we're safe to transfer it
          // (and thus detach its underlying buffer) because it will constitute
          // the entire DecodeStream's data.  But if it came from a Stream, we
          // need to copy it because it'll only be a portion of the Stream's
          // data, and the rest will be read later on.
          if (this.image instanceof DecodeStream) {
            imgData.data = imgArray;
          } else {
            var newArray = new Uint8Array(imgArray.length);
            newArray.set(imgArray);
            imgData.data = newArray;
          }
          if (this.needsDecode) {
            // Invert the buffer (which must be grayscale if we reached here).
            assert(kind === ImageKind.GRAYSCALE_1BPP);
            var buffer = imgData.data;
            for (var i = 0, ii = buffer.length; i < ii; i++) {
              buffer[i] ^= 0xff;
            }
          }
          return imgData;
        }
        if (this.image instanceof JpegStream && !this.smask && !this.mask &&
            (this.colorSpace.name === 'DeviceGray' ||
             this.colorSpace.name === 'DeviceRGB' ||
             this.colorSpace.name === 'DeviceCMYK')) {
          imgData.kind = ImageKind.RGB_24BPP;
          imgData.data = this.getImageBytes(originalHeight * rowBytes,
                                            drawWidth, drawHeight, true);
          return imgData;
        }
      }

      imgArray = this.getImageBytes(originalHeight * rowBytes);
      // imgArray can be incomplete (e.g. after CCITT fax encoding).
      var actualHeight = 0 | (imgArray.length / rowBytes *
                         drawHeight / originalHeight);

      var comps = this.getComponents(imgArray);

      // If opacity data is present, use RGBA_32BPP form. Otherwise, use the
      // more compact RGB_24BPP form if allowable.
      var alpha01, maybeUndoPreblend;
      if (!forceRGBA && !this.smask && !this.mask) {
        imgData.kind = ImageKind.RGB_24BPP;
        imgData.data = new Uint8Array(drawWidth * drawHeight * 3);
        alpha01 = 0;
        maybeUndoPreblend = false;
      } else {
        imgData.kind = ImageKind.RGBA_32BPP;
        imgData.data = new Uint8Array(drawWidth * drawHeight * 4);
        alpha01 = 1;
        maybeUndoPreblend = true;

        // Color key masking (opacity) must be performed before decoding.
        this.fillOpacity(imgData.data, drawWidth, drawHeight, actualHeight,
                         comps);
      }

      if (this.needsDecode) {
        this.decodeBuffer(comps);
      }
      this.colorSpace.fillRgb(imgData.data, originalWidth, originalHeight,
                              drawWidth, drawHeight, actualHeight, bpc, comps,
                              alpha01);
      if (maybeUndoPreblend) {
        this.undoPreblend(imgData.data, drawWidth, actualHeight);
      }

      return imgData;
    },

    fillGrayBuffer: function PDFImage_fillGrayBuffer(buffer) {
      var numComps = this.numComps;
      if (numComps !== 1) {
        error('Reading gray scale from a color image: ' + numComps);
      }

      var width = this.width;
      var height = this.height;
      var bpc = this.bpc;

      // rows start at byte boundary
      var rowBytes = (width * numComps * bpc + 7) >> 3;
      var imgArray = this.getImageBytes(height * rowBytes);

      var comps = this.getComponents(imgArray);
      var i, length;

      if (bpc === 1) {
        // inline decoding (= inversion) for 1 bpc images
        length = width * height;
        if (this.needsDecode) {
          // invert and scale to {0, 255}
          for (i = 0; i < length; ++i) {
            buffer[i] = (comps[i] - 1) & 255;
          }
        } else {
          // scale to {0, 255}
          for (i = 0; i < length; ++i) {
            buffer[i] = (-comps[i]) & 255;
          }
        }
        return;
      }

      if (this.needsDecode) {
        this.decodeBuffer(comps);
      }
      length = width * height;
      // we aren't using a colorspace so we need to scale the value
      var scale = 255 / ((1 << bpc) - 1);
      for (i = 0; i < length; ++i) {
        buffer[i] = (scale * comps[i]) | 0;
      }
    },

    getImageBytes: function PDFImage_getImageBytes(length,
                                                   drawWidth, drawHeight,
                                                   forceRGB) {
      this.image.reset();
      this.image.drawWidth = drawWidth || this.width;
      this.image.drawHeight = drawHeight || this.height;
      this.image.forceRGB = !!forceRGB;
      return this.image.getBytes(length);
    }
  };
  return PDFImage;
})();

exports.PDFImage = PDFImage;
}));


(function (root, factory) {
  {
    factory((root.pdfjsCoreObj = {}), root.pdfjsSharedUtil,
      root.pdfjsCorePrimitives, root.pdfjsCoreCrypto, root.pdfjsCoreParser,
      root.pdfjsCoreChunkedStream, root.pdfjsCoreColorSpace);
  }
}(this, function (exports, sharedUtil, corePrimitives, coreCrypto, coreParser,
                  coreChunkedStream, coreColorSpace) {

var InvalidPDFException = sharedUtil.InvalidPDFException;
var MissingDataException = sharedUtil.MissingDataException;
var XRefParseException = sharedUtil.XRefParseException;
var assert = sharedUtil.assert;
var bytesToString = sharedUtil.bytesToString;
var createPromiseCapability = sharedUtil.createPromiseCapability;
var error = sharedUtil.error;
var info = sharedUtil.info;
var isArray = sharedUtil.isArray;
var isInt = sharedUtil.isInt;
var isString = sharedUtil.isString;
var shadow = sharedUtil.shadow;
var stringToPDFString = sharedUtil.stringToPDFString;
var stringToUTF8String = sharedUtil.stringToUTF8String;
var warn = sharedUtil.warn;
var isValidUrl = sharedUtil.isValidUrl;
var Util = sharedUtil.Util;
var Ref = corePrimitives.Ref;
var RefSet = corePrimitives.RefSet;
var RefSetCache = corePrimitives.RefSetCache;
var isName = corePrimitives.isName;
var isCmd = corePrimitives.isCmd;
var isDict = corePrimitives.isDict;
var isRef = corePrimitives.isRef;
var isStream = corePrimitives.isStream;
var CipherTransformFactory = coreCrypto.CipherTransformFactory;
var Lexer = coreParser.Lexer;
var Parser = coreParser.Parser;
var ChunkedStream = coreChunkedStream.ChunkedStream;
var ColorSpace = coreColorSpace.ColorSpace;

var Catalog = (function CatalogClosure() {
  function Catalog(pdfManager, xref, pageFactory) {
    this.pdfManager = pdfManager;
    this.xref = xref;
    this.catDict = xref.getCatalogObj();
    this.fontCache = new RefSetCache();
    assert(isDict(this.catDict),
      'catalog object is not a dictionary');

    // TODO refactor to move getPage() to the PDFDocument.
    this.pageFactory = pageFactory;
    this.pagePromises = [];
  }

  Catalog.prototype = {
    get metadata() {
      var streamRef = this.catDict.getRaw('Metadata');
      if (!isRef(streamRef)) {
        return shadow(this, 'metadata', null);
      }

      var encryptMetadata = (!this.xref.encrypt ? false :
                             this.xref.encrypt.encryptMetadata);

      var stream = this.xref.fetch(streamRef, !encryptMetadata);
      var metadata;
      if (stream && isDict(stream.dict)) {
        var type = stream.dict.get('Type');
        var subtype = stream.dict.get('Subtype');

        if (isName(type) && isName(subtype) &&
            type.name === 'Metadata' && subtype.name === 'XML') {
          // XXX: This should examine the charset the XML document defines,
          // however since there are currently no real means to decode
          // arbitrary charsets, let's just hope that the author of the PDF
          // was reasonable enough to stick with the XML default charset,
          // which is UTF-8.
          try {
            metadata = stringToUTF8String(bytesToString(stream.getBytes()));
          } catch (e) {
            info('Skipping invalid metadata.');
          }
        }
      }

      return shadow(this, 'metadata', metadata);
    },
    get toplevelPagesDict() {
      var pagesObj = this.catDict.get('Pages');
      assert(isDict(pagesObj), 'invalid top-level pages dictionary');
      // shadow the prototype getter
      return shadow(this, 'toplevelPagesDict', pagesObj);
    },
    get documentOutline() {
      var obj = null;
      try {
        obj = this.readDocumentOutline();
      } catch (ex) {
        if (ex instanceof MissingDataException) {
          throw ex;
        }
        warn('Unable to read document outline');
      }
      return shadow(this, 'documentOutline', obj);
    },
    readDocumentOutline: function Catalog_readDocumentOutline() {
      var obj = this.catDict.get('Outlines');
      if (!isDict(obj)) {
        return null;
      }
      obj = obj.getRaw('First');
      if (!isRef(obj)) {
        return null;
      }
      var root = { items: [] };
      var queue = [{obj: obj, parent: root}];
      // To avoid recursion, keep track of the already processed items.
      var processed = new RefSet();
      processed.put(obj);
      var xref = this.xref, blackColor = new Uint8Array(3);

      while (queue.length > 0) {
        var i = queue.shift();
        var outlineDict = xref.fetchIfRef(i.obj);
        if (outlineDict === null) {
          continue;
        }
        assert(outlineDict.has('Title'), 'Invalid outline item');

        var actionDict = outlineDict.get('A'), dest = null, url = null;
        if (actionDict) {
          var destEntry = actionDict.get('D');
          if (destEntry) {
            dest = destEntry;
          } else {
            var uriEntry = actionDict.get('URI');
            if (isString(uriEntry) && isValidUrl(uriEntry, false)) {
              url = uriEntry;
            }
          }
        } else if (outlineDict.has('Dest')) {
          dest = outlineDict.getRaw('Dest');
          if (isName(dest)) {
            dest = dest.name;
          }
        }
        var title = outlineDict.get('Title');
        var flags = outlineDict.get('F') || 0;

        var color = outlineDict.get('C'), rgbColor = blackColor;
        // We only need to parse the color when it's valid, and non-default.
        if (isArray(color) && color.length === 3 &&
            (color[0] !== 0 || color[1] !== 0 || color[2] !== 0)) {
          rgbColor = ColorSpace.singletons.rgb.getRgb(color, 0);
        }
        var outlineItem = {
          dest: dest,
          url: url,
          title: stringToPDFString(title),
          color: rgbColor,
          count: outlineDict.get('Count'),
          bold: !!(flags & 2),
          italic: !!(flags & 1),
          items: []
        };
        i.parent.items.push(outlineItem);
        obj = outlineDict.getRaw('First');
        if (isRef(obj) && !processed.has(obj)) {
          queue.push({obj: obj, parent: outlineItem});
          processed.put(obj);
        }
        obj = outlineDict.getRaw('Next');
        if (isRef(obj) && !processed.has(obj)) {
          queue.push({obj: obj, parent: i.parent});
          processed.put(obj);
        }
      }
      return (root.items.length > 0 ? root.items : null);
    },
    get numPages() {
      var obj = this.toplevelPagesDict.get('Count');
      assert(
        isInt(obj),
        'page count in top level pages object is not an integer'
      );
      // shadow the prototype getter
      return shadow(this, 'num', obj);
    },
    get destinations() {
      function fetchDestination(dest) {
        return isDict(dest) ? dest.get('D') : dest;
      }

      var xref = this.xref;
      var dests = {}, nameTreeRef, nameDictionaryRef;
      var obj = this.catDict.get('Names');
      if (obj && obj.has('Dests')) {
        nameTreeRef = obj.getRaw('Dests');
      } else if (this.catDict.has('Dests')) {
        nameDictionaryRef = this.catDict.get('Dests');
      }

      if (nameDictionaryRef) {
        // reading simple destination dictionary
        obj = nameDictionaryRef;
        obj.forEach(function catalogForEach(key, value) {
          if (!value) {
            return;
          }
          dests[key] = fetchDestination(value);
        });
      }
      if (nameTreeRef) {
        var nameTree = new NameTree(nameTreeRef, xref);
        var names = nameTree.getAll();
        for (var name in names) {
          dests[name] = fetchDestination(names[name]);
        }
      }
      return shadow(this, 'destinations', dests);
    },
    getDestination: function Catalog_getDestination(destinationId) {
      function fetchDestination(dest) {
        return isDict(dest) ? dest.get('D') : dest;
      }

      var xref = this.xref;
      var dest = null, nameTreeRef, nameDictionaryRef;
      var obj = this.catDict.get('Names');
      if (obj && obj.has('Dests')) {
        nameTreeRef = obj.getRaw('Dests');
      } else if (this.catDict.has('Dests')) {
        nameDictionaryRef = this.catDict.get('Dests');
      }

      if (nameDictionaryRef) { // Simple destination dictionary.
        var value = nameDictionaryRef.get(destinationId);
        if (value) {
          dest = fetchDestination(value);
        }
      }
      if (nameTreeRef) {
        var nameTree = new NameTree(nameTreeRef, xref);
        dest = fetchDestination(nameTree.get(destinationId));
      }
      return dest;
    },

    get pageLabels() {
      var obj = null;
      try {
        obj = this.readPageLabels();
      } catch (ex) {
        if (ex instanceof MissingDataException) {
          throw ex;
        }
        warn('Unable to read page labels.');
      }
      return shadow(this, 'pageLabels', obj);
    },
    readPageLabels: function Catalog_readPageLabels() {
      var obj = this.catDict.getRaw('PageLabels');
      if (!obj) {
        return null;
      }
      var pageLabels = new Array(this.numPages);
      var style = null;
      var prefix = '';
      var start = 1;

      var numberTree = new NumberTree(obj, this.xref);
      var nums = numberTree.getAll();
      var currentLabel = '', currentIndex = 1;

      for (var i = 0, ii = this.numPages; i < ii; i++) {
        if (i in nums) {
          var labelDict = nums[i];
          assert(isDict(labelDict), 'The PageLabel is not a dictionary.');

          var type = labelDict.get('Type');
          assert(!type || (isName(type) && type.name === 'PageLabel'),
                 'Invalid type in PageLabel dictionary.');

          var s = labelDict.get('S');
          assert(!s || isName(s), 'Invalid style in PageLabel dictionary.');
          style = (s ? s.name : null);

          prefix = labelDict.get('P') || '';
          assert(isString(prefix), 'Invalid prefix in PageLabel dictionary.');

          start = labelDict.get('St') || 1;
          assert(isInt(start), 'Invalid start in PageLabel dictionary.');
          currentIndex = start;
        }

        switch (style) {
          case 'D':
            currentLabel = currentIndex;
            break;
          case 'R':
          case 'r':
            currentLabel = Util.toRoman(currentIndex, style === 'r');
            break;
          case 'A':
          case 'a':
            var LIMIT = 26; // Use only the characters A--Z, or a--z.
            var A_UPPER_CASE = 0x41, A_LOWER_CASE = 0x61;

            var baseCharCode = (style === 'a' ? A_LOWER_CASE : A_UPPER_CASE);
            var letterIndex = currentIndex - 1;
            var character = String.fromCharCode(baseCharCode +
                                                (letterIndex % LIMIT));
            var charBuf = [];
            for (var j = 0, jj = (letterIndex / LIMIT) | 0; j <= jj; j++) {
              charBuf.push(character);
            }
            currentLabel = charBuf.join('');
            break;
          default:
            assert(!style,
                   'Invalid style "' + style + '" in PageLabel dictionary.');
        }
        pageLabels[i] = prefix + currentLabel;

        currentLabel = '';
        currentIndex++;
      }
      return pageLabels;
    },

    get attachments() {
      var xref = this.xref;
      var attachments = null, nameTreeRef;
      var obj = this.catDict.get('Names');
      if (obj) {
        nameTreeRef = obj.getRaw('EmbeddedFiles');
      }

      if (nameTreeRef) {
        var nameTree = new NameTree(nameTreeRef, xref);
        var names = nameTree.getAll();
        for (var name in names) {
          var fs = new FileSpec(names[name], xref);
          if (!attachments) {
            attachments = Object.create(null);
          }
          attachments[stringToPDFString(name)] = fs.serializable;
        }
      }
      return shadow(this, 'attachments', attachments);
    },
    get javaScript() {
      var xref = this.xref;
      var obj = this.catDict.get('Names');

      var javaScript = [];
      function appendIfJavaScriptDict(jsDict) {
        var type = jsDict.get('S');
        if (!isName(type) || type.name !== 'JavaScript') {
          return;
        }
        var js = jsDict.get('JS');
        if (isStream(js)) {
          js = bytesToString(js.getBytes());
        } else if (!isString(js)) {
          return;
        }
        javaScript.push(stringToPDFString(js));
      }
      if (obj && obj.has('JavaScript')) {
        var nameTree = new NameTree(obj.getRaw('JavaScript'), xref);
        var names = nameTree.getAll();
        for (var name in names) {
          // We don't really use the JavaScript right now. This code is
          // defensive so we don't cause errors on document load.
          var jsDict = names[name];
          if (isDict(jsDict)) {
            appendIfJavaScriptDict(jsDict);
          }
        }
      }

      // Append OpenAction actions to javaScript array
      var openactionDict = this.catDict.get('OpenAction');
      if (isDict(openactionDict, 'Action')) {
        var actionType = openactionDict.get('S');
        if (isName(actionType) && actionType.name === 'Named') {
          // The named Print action is not a part of the PDF 1.7 specification,
          // but is supported by many PDF readers/writers (including Adobe's).
          var action = openactionDict.get('N');
          if (isName(action) && action.name === 'Print') {
            javaScript.push('print({});');
          }
        } else {
          appendIfJavaScriptDict(openactionDict);
        }
      }

      return shadow(this, 'javaScript', javaScript);
    },

    cleanup: function Catalog_cleanup() {
      var promises = [];
      this.fontCache.forEach(function (promise) {
        promises.push(promise);
      });
      return Promise.all(promises).then(function (translatedFonts) {
        for (var i = 0, ii = translatedFonts.length; i < ii; i++) {
          var font = translatedFonts[i].dict;
          delete font.translated;
        }
        this.fontCache.clear();
      }.bind(this));
    },

    getPage: function Catalog_getPage(pageIndex) {
      if (!(pageIndex in this.pagePromises)) {
        this.pagePromises[pageIndex] = this.getPageDict(pageIndex).then(
          function (a) {
            var dict = a[0];
            var ref = a[1];
            return this.pageFactory.createPage(pageIndex, dict, ref,
                                               this.fontCache);
          }.bind(this)
        );
      }
      return this.pagePromises[pageIndex];
    },

    getPageDict: function Catalog_getPageDict(pageIndex) {
      var capability = createPromiseCapability();
      var nodesToVisit = [this.catDict.getRaw('Pages')];
      var currentPageIndex = 0;
      var xref = this.xref;
      var checkAllKids = false;

      function next() {
        while (nodesToVisit.length) {
          var currentNode = nodesToVisit.pop();

          if (isRef(currentNode)) {
            xref.fetchAsync(currentNode).then(function (obj) {
              if (isDict(obj, 'Page') || (isDict(obj) && !obj.has('Kids'))) {
                if (pageIndex === currentPageIndex) {
                  capability.resolve([obj, currentNode]);
                } else {
                  currentPageIndex++;
                  next();
                }
                return;
              }
              nodesToVisit.push(obj);
              next();
            }, capability.reject);
            return;
          }

          // Must be a child page dictionary.
          assert(
            isDict(currentNode),
            'page dictionary kid reference points to wrong type of object'
          );
          var count = currentNode.get('Count');
          // If the current node doesn't have any children, avoid getting stuck
          // in an empty node further down in the tree (see issue5644.pdf).
          if (count === 0) {
            checkAllKids = true;
          }
          // Skip nodes where the page can't be.
          if (currentPageIndex + count <= pageIndex) {
            currentPageIndex += count;
            continue;
          }

          var kids = currentNode.get('Kids');
          assert(isArray(kids), 'page dictionary kids object is not an array');
          if (!checkAllKids && count === kids.length) {
            // Nodes that don't have the page have been skipped and this is the
            // bottom of the tree which means the page requested must be a
            // descendant of this pages node. Ideally we would just resolve the
            // promise with the page ref here, but there is the case where more
            // pages nodes could link to single a page (see issue 3666 pdf). To
            // handle this push it back on the queue so if it is a pages node it
            // will be descended into.
            nodesToVisit = [kids[pageIndex - currentPageIndex]];
            currentPageIndex = pageIndex;
            continue;
          } else {
            for (var last = kids.length - 1; last >= 0; last--) {
              nodesToVisit.push(kids[last]);
            }
          }
        }
        capability.reject('Page index ' + pageIndex + ' not found.');
      }
      next();
      return capability.promise;
    },

    getPageIndex: function Catalog_getPageIndex(ref) {
      // The page tree nodes have the count of all the leaves below them. To get
      // how many pages are before we just have to walk up the tree and keep
      // adding the count of siblings to the left of the node.
      var xref = this.xref;
      function pagesBeforeRef(kidRef) {
        var total = 0;
        var parentRef;
        return xref.fetchAsync(kidRef).then(function (node) {
          if (!node) {
            return null;
          }
          parentRef = node.getRaw('Parent');
          return node.getAsync('Parent');
        }).then(function (parent) {
          if (!parent) {
            return null;
          }
          return parent.getAsync('Kids');
        }).then(function (kids) {
          if (!kids) {
            return null;
          }
          var kidPromises = [];
          var found = false;
          for (var i = 0; i < kids.length; i++) {
            var kid = kids[i];
            assert(isRef(kid), 'kids must be a ref');
            if (kid.num === kidRef.num) {
              found = true;
              break;
            }
            kidPromises.push(xref.fetchAsync(kid).then(function (kid) {
              if (kid.has('Count')) {
                var count = kid.get('Count');
                total += count;
              } else { // page leaf node
                total++;
              }
            }));
          }
          if (!found) {
            error('kid ref not found in parents kids');
          }
          return Promise.all(kidPromises).then(function () {
            return [total, parentRef];
          });
        });
      }

      var total = 0;
      function next(ref) {
        return pagesBeforeRef(ref).then(function (args) {
          if (!args) {
            return total;
          }
          var count = args[0];
          var parentRef = args[1];
          total += count;
          return next(parentRef);
        });
      }

      return next(ref);
    }
  };

  return Catalog;
})();

var XRef = (function XRefClosure() {
  function XRef(stream, password) {
    this.stream = stream;
    this.entries = [];
    this.xrefstms = Object.create(null);
    // prepare the XRef cache
    this.cache = [];
    this.password = password;
    this.stats = {
      streamTypes: [],
      fontTypes: []
    };
  }

  XRef.prototype = {
    setStartXRef: function XRef_setStartXRef(startXRef) {
      // Store the starting positions of xref tables as we process them
      // so we can recover from missing data errors
      this.startXRefQueue = [startXRef];
    },

    parse: function XRef_parse(recoveryMode) {
      var trailerDict;
      if (!recoveryMode) {
        trailerDict = this.readXRef();
      } else {
        warn('Indexing all PDF objects');
        trailerDict = this.indexObjects();
      }
      trailerDict.assignXref(this);
      this.trailer = trailerDict;
      var encrypt = trailerDict.get('Encrypt');
      if (encrypt) {
        var ids = trailerDict.get('ID');
        var fileId = (ids && ids.length) ? ids[0] : '';
        this.encrypt = new CipherTransformFactory(encrypt, fileId,
                                                  this.password);
      }

      // get the root dictionary (catalog) object
      if (!(this.root = trailerDict.get('Root'))) {
        error('Invalid root reference');
      }
    },

    processXRefTable: function XRef_processXRefTable(parser) {
      if (!('tableState' in this)) {
        // Stores state of the table as we process it so we can resume
        // from middle of table in case of missing data error
        this.tableState = {
          entryNum: 0,
          streamPos: parser.lexer.stream.pos,
          parserBuf1: parser.buf1,
          parserBuf2: parser.buf2
        };
      }

      var obj = this.readXRefTable(parser);

      // Sanity check
      if (!isCmd(obj, 'trailer')) {
        error('Invalid XRef table: could not find trailer dictionary');
      }
      // Read trailer dictionary, e.g.
      // trailer
      //    << /Size 22
      //      /Root 20R
      //      /Info 10R
      //      /ID [ <81b14aafa313db63dbd6f981e49f94f4> ]
      //    >>
      // The parser goes through the entire stream << ... >> and provides
      // a getter interface for the key-value table
      var dict = parser.getObj();

      // The pdflib PDF generator can generate a nested trailer dictionary
      if (!isDict(dict) && dict.dict) {
        dict = dict.dict;
      }
      if (!isDict(dict)) {
        error('Invalid XRef table: could not parse trailer dictionary');
      }
      delete this.tableState;

      return dict;
    },

    readXRefTable: function XRef_readXRefTable(parser) {
      // Example of cross-reference table:
      // xref
      // 0 1                    <-- subsection header (first obj #, obj count)
      // 0000000000 65535 f     <-- actual object (offset, generation #, f/n)
      // 23 2                   <-- subsection header ... and so on ...
      // 0000025518 00002 n
      // 0000025635 00000 n
      // trailer
      // ...

      var stream = parser.lexer.stream;
      var tableState = this.tableState;
      stream.pos = tableState.streamPos;
      parser.buf1 = tableState.parserBuf1;
      parser.buf2 = tableState.parserBuf2;

      // Outer loop is over subsection headers
      var obj;

      while (true) {
        if (!('firstEntryNum' in tableState) || !('entryCount' in tableState)) {
          if (isCmd(obj = parser.getObj(), 'trailer')) {
            break;
          }
          tableState.firstEntryNum = obj;
          tableState.entryCount = parser.getObj();
        }

        var first = tableState.firstEntryNum;
        var count = tableState.entryCount;
        if (!isInt(first) || !isInt(count)) {
          error('Invalid XRef table: wrong types in subsection header');
        }
        // Inner loop is over objects themselves
        for (var i = tableState.entryNum; i < count; i++) {
          tableState.streamPos = stream.pos;
          tableState.entryNum = i;
          tableState.parserBuf1 = parser.buf1;
          tableState.parserBuf2 = parser.buf2;

          var entry = {};
          entry.offset = parser.getObj();
          entry.gen = parser.getObj();
          var type = parser.getObj();

          if (isCmd(type, 'f')) {
            entry.free = true;
          } else if (isCmd(type, 'n')) {
            entry.uncompressed = true;
          }

          // Validate entry obj
          if (!isInt(entry.offset) || !isInt(entry.gen) ||
              !(entry.free || entry.uncompressed)) {
            error('Invalid entry in XRef subsection: ' + first + ', ' + count);
          }

          // The first xref table entry, i.e. obj 0, should be free. Attempting
          // to adjust an incorrect first obj # (fixes issue 3248 and 7229).
          if (i === 0 && entry.free && first === 1) {
            first = 0;
          }

          if (!this.entries[i + first]) {
            this.entries[i + first] = entry;
          }
        }

        tableState.entryNum = 0;
        tableState.streamPos = stream.pos;
        tableState.parserBuf1 = parser.buf1;
        tableState.parserBuf2 = parser.buf2;
        delete tableState.firstEntryNum;
        delete tableState.entryCount;
      }

      // Sanity check: as per spec, first object must be free
      if (this.entries[0] && !this.entries[0].free) {
        error('Invalid XRef table: unexpected first object');
      }
      return obj;
    },

    processXRefStream: function XRef_processXRefStream(stream) {
      if (!('streamState' in this)) {
        // Stores state of the stream as we process it so we can resume
        // from middle of stream in case of missing data error
        var streamParameters = stream.dict;
        var byteWidths = streamParameters.get('W');
        var range = streamParameters.get('Index');
        if (!range) {
          range = [0, streamParameters.get('Size')];
        }

        this.streamState = {
          entryRanges: range,
          byteWidths: byteWidths,
          entryNum: 0,
          streamPos: stream.pos
        };
      }
      this.readXRefStream(stream);
      delete this.streamState;

      return stream.dict;
    },

    readXRefStream: function XRef_readXRefStream(stream) {
      var i, j;
      var streamState = this.streamState;
      stream.pos = streamState.streamPos;

      var byteWidths = streamState.byteWidths;
      var typeFieldWidth = byteWidths[0];
      var offsetFieldWidth = byteWidths[1];
      var generationFieldWidth = byteWidths[2];

      var entryRanges = streamState.entryRanges;
      while (entryRanges.length > 0) {
        var first = entryRanges[0];
        var n = entryRanges[1];

        if (!isInt(first) || !isInt(n)) {
          error('Invalid XRef range fields: ' + first + ', ' + n);
        }
        if (!isInt(typeFieldWidth) || !isInt(offsetFieldWidth) ||
            !isInt(generationFieldWidth)) {
          error('Invalid XRef entry fields length: ' + first + ', ' + n);
        }
        for (i = streamState.entryNum; i < n; ++i) {
          streamState.entryNum = i;
          streamState.streamPos = stream.pos;

          var type = 0, offset = 0, generation = 0;
          for (j = 0; j < typeFieldWidth; ++j) {
            type = (type << 8) | stream.getByte();
          }
          // if type field is absent, its default value is 1
          if (typeFieldWidth === 0) {
            type = 1;
          }
          for (j = 0; j < offsetFieldWidth; ++j) {
            offset = (offset << 8) | stream.getByte();
          }
          for (j = 0; j < generationFieldWidth; ++j) {
            generation = (generation << 8) | stream.getByte();
          }
          var entry = {};
          entry.offset = offset;
          entry.gen = generation;
          switch (type) {
            case 0:
              entry.free = true;
              break;
            case 1:
              entry.uncompressed = true;
              break;
            case 2:
              break;
            default:
              error('Invalid XRef entry type: ' + type);
          }
          if (!this.entries[first + i]) {
            this.entries[first + i] = entry;
          }
        }

        streamState.entryNum = 0;
        streamState.streamPos = stream.pos;
        entryRanges.splice(0, 2);
      }
    },

    indexObjects: function XRef_indexObjects() {
      // Simple scan through the PDF content to find objects,
      // trailers and XRef streams.
      var TAB = 0x9, LF = 0xA, CR = 0xD, SPACE = 0x20;
      var PERCENT = 0x25, LT = 0x3C;

      function readToken(data, offset) {
        var token = '', ch = data[offset];
        while (ch !== LF && ch !== CR && ch !== LT) {
          if (++offset >= data.length) {
            break;
          }
          token += String.fromCharCode(ch);
          ch = data[offset];
        }
        return token;
      }
      function skipUntil(data, offset, what) {
        var length = what.length, dataLength = data.length;
        var skipped = 0;
        // finding byte sequence
        while (offset < dataLength) {
          var i = 0;
          while (i < length && data[offset + i] === what[i]) {
            ++i;
          }
          if (i >= length) {
            break; // sequence found
          }
          offset++;
          skipped++;
        }
        return skipped;
      }
      var objRegExp = /^(\d+)\s+(\d+)\s+obj\b/;
      var trailerBytes = new Uint8Array([116, 114, 97, 105, 108, 101, 114]);
      var startxrefBytes = new Uint8Array([115, 116, 97, 114, 116, 120, 114,
                                          101, 102]);
      var endobjBytes = new Uint8Array([101, 110, 100, 111, 98, 106]);
      var xrefBytes = new Uint8Array([47, 88, 82, 101, 102]);

      // Clear out any existing entries, since they may be bogus.
      this.entries.length = 0;

      var stream = this.stream;
      stream.pos = 0;
      var buffer = stream.getBytes();
      var position = stream.start, length = buffer.length;
      var trailers = [], xrefStms = [];
      while (position < length) {
        var ch = buffer[position];
        if (ch === TAB || ch === LF || ch === CR || ch === SPACE) {
          ++position;
          continue;
        }
        if (ch === PERCENT) { // %-comment
          do {
            ++position;
            if (position >= length) {
              break;
            }
            ch = buffer[position];
          } while (ch !== LF && ch !== CR);
          continue;
        }
        var token = readToken(buffer, position);
        var m;
        if (token.indexOf('xref') === 0 &&
            (token.length === 4 || /\s/.test(token[4]))) {
          position += skipUntil(buffer, position, trailerBytes);
          trailers.push(position);
          position += skipUntil(buffer, position, startxrefBytes);
        } else if ((m = objRegExp.exec(token))) {
          if (typeof this.entries[m[1]] === 'undefined') {
            this.entries[m[1]] = {
              offset: position - stream.start,
              gen: m[2] | 0,
              uncompressed: true
            };
          }
          var contentLength = skipUntil(buffer, position, endobjBytes) + 7;
          var content = buffer.subarray(position, position + contentLength);

          // checking XRef stream suspect
          // (it shall have '/XRef' and next char is not a letter)
          var xrefTagOffset = skipUntil(content, 0, xrefBytes);
          if (xrefTagOffset < contentLength &&
              content[xrefTagOffset + 5] < 64) {
            xrefStms.push(position - stream.start);
            this.xrefstms[position - stream.start] = 1; // Avoid recursion
          }

          position += contentLength;
        } else if (token.indexOf('trailer') === 0 &&
                   (token.length === 7 || /\s/.test(token[7]))) {
          trailers.push(position);
          position += skipUntil(buffer, position, startxrefBytes);
        } else {
          position += token.length + 1;
        }
      }
      // reading XRef streams
      var i, ii;
      for (i = 0, ii = xrefStms.length; i < ii; ++i) {
        this.startXRefQueue.push(xrefStms[i]);
        this.readXRef(/* recoveryMode */ true);
      }
      // finding main trailer
      var dict;
      for (i = 0, ii = trailers.length; i < ii; ++i) {
        stream.pos = trailers[i];
        var parser = new Parser(new Lexer(stream), true, this);
        var obj = parser.getObj();
        if (!isCmd(obj, 'trailer')) {
          continue;
        }
        // read the trailer dictionary
        if (!isDict(dict = parser.getObj())) {
          continue;
        }
        // taking the first one with 'ID'
        if (dict.has('ID')) {
          return dict;
        }
      }
      // no tailer with 'ID', taking last one (if exists)
      if (dict) {
        return dict;
      }
      // nothing helps
      // calling error() would reject worker with an UnknownErrorException.
      throw new InvalidPDFException('Invalid PDF structure');
    },

    readXRef: function XRef_readXRef(recoveryMode) {
      var stream = this.stream;

      try {
        while (this.startXRefQueue.length) {
          var startXRef = this.startXRefQueue[0];

          stream.pos = startXRef + stream.start;

          var parser = new Parser(new Lexer(stream), true, this);
          var obj = parser.getObj();
          var dict;

          // Get dictionary
          if (isCmd(obj, 'xref')) {
            // Parse end-of-file XRef
            dict = this.processXRefTable(parser);
            if (!this.topDict) {
              this.topDict = dict;
            }

            // Recursively get other XRefs 'XRefStm', if any
            obj = dict.get('XRefStm');
            if (isInt(obj)) {
              var pos = obj;
              // ignore previously loaded xref streams
              // (possible infinite recursion)
              if (!(pos in this.xrefstms)) {
                this.xrefstms[pos] = 1;
                this.startXRefQueue.push(pos);
              }
            }
          } else if (isInt(obj)) {
            // Parse in-stream XRef
            if (!isInt(parser.getObj()) ||
                !isCmd(parser.getObj(), 'obj') ||
                !isStream(obj = parser.getObj())) {
              error('Invalid XRef stream');
            }
            dict = this.processXRefStream(obj);
            if (!this.topDict) {
              this.topDict = dict;
            }
            if (!dict) {
              error('Failed to read XRef stream');
            }
          } else {
            error('Invalid XRef stream header');
          }

          // Recursively get previous dictionary, if any
          obj = dict.get('Prev');
          if (isInt(obj)) {
            this.startXRefQueue.push(obj);
          } else if (isRef(obj)) {
            // The spec says Prev must not be a reference, i.e. "/Prev NNN"
            // This is a fallback for non-compliant PDFs, i.e. "/Prev NNN 0 R"
            this.startXRefQueue.push(obj.num);
          }

          this.startXRefQueue.shift();
        }

        return this.topDict;
      } catch (e) {
        if (e instanceof MissingDataException) {
          throw e;
        }
        info('(while reading XRef): ' + e);
      }

      if (recoveryMode) {
        return;
      }
      throw new XRefParseException();
    },

    getEntry: function XRef_getEntry(i) {
      var xrefEntry = this.entries[i];
      if (xrefEntry && !xrefEntry.free && xrefEntry.offset) {
        return xrefEntry;
      }
      return null;
    },

    fetchIfRef: function XRef_fetchIfRef(obj) {
      if (!isRef(obj)) {
        return obj;
      }
      return this.fetch(obj);
    },

    fetch: function XRef_fetch(ref, suppressEncryption) {
      assert(isRef(ref), 'ref object is not a reference');
      var num = ref.num;
      if (num in this.cache) {
        var cacheEntry = this.cache[num];
        return cacheEntry;
      }

      var xrefEntry = this.getEntry(num);

      // the referenced entry can be free
      if (xrefEntry === null) {
        return (this.cache[num] = null);
      }

      if (xrefEntry.uncompressed) {
        xrefEntry = this.fetchUncompressed(ref, xrefEntry, suppressEncryption);
      } else {
        xrefEntry = this.fetchCompressed(xrefEntry, suppressEncryption);
      }
      if (isDict(xrefEntry)){
        xrefEntry.objId = ref.toString();
      } else if (isStream(xrefEntry)) {
        xrefEntry.dict.objId = ref.toString();
      }
      return xrefEntry;
    },

    fetchUncompressed: function XRef_fetchUncompressed(ref, xrefEntry,
                                                       suppressEncryption) {
      var gen = ref.gen;
      var num = ref.num;
      if (xrefEntry.gen !== gen) {
        error('inconsistent generation in XRef');
      }
      var stream = this.stream.makeSubStream(xrefEntry.offset +
                                             this.stream.start);
      var parser = new Parser(new Lexer(stream), true, this);
      var obj1 = parser.getObj();
      var obj2 = parser.getObj();
      var obj3 = parser.getObj();
      if (!isInt(obj1) || parseInt(obj1, 10) !== num ||
          !isInt(obj2) || parseInt(obj2, 10) !== gen ||
          !isCmd(obj3)) {
        error('bad XRef entry');
      }
      if (!isCmd(obj3, 'obj')) {
        // some bad PDFs use "obj1234" and really mean 1234
        if (obj3.cmd.indexOf('obj') === 0) {
          num = parseInt(obj3.cmd.substring(3), 10);
          if (!isNaN(num)) {
            return num;
          }
        }
        error('bad XRef entry');
      }
      if (this.encrypt && !suppressEncryption) {
        xrefEntry = parser.getObj(this.encrypt.createCipherTransform(num, gen));
      } else {
        xrefEntry = parser.getObj();
      }
      if (!isStream(xrefEntry)) {
        this.cache[num] = xrefEntry;
      }
      return xrefEntry;
    },

    fetchCompressed: function XRef_fetchCompressed(xrefEntry,
                                                   suppressEncryption) {
      var tableOffset = xrefEntry.offset;
      var stream = this.fetch(new Ref(tableOffset, 0));
      if (!isStream(stream)) {
        error('bad ObjStm stream');
      }
      var first = stream.dict.get('First');
      var n = stream.dict.get('N');
      if (!isInt(first) || !isInt(n)) {
        error('invalid first and n parameters for ObjStm stream');
      }
      var parser = new Parser(new Lexer(stream), false, this);
      parser.allowStreams = true;
      var i, entries = [], num, nums = [];
      // read the object numbers to populate cache
      for (i = 0; i < n; ++i) {
        num = parser.getObj();
        if (!isInt(num)) {
          error('invalid object number in the ObjStm stream: ' + num);
        }
        nums.push(num);
        var offset = parser.getObj();
        if (!isInt(offset)) {
          error('invalid object offset in the ObjStm stream: ' + offset);
        }
      }
      // read stream objects for cache
      for (i = 0; i < n; ++i) {
        entries.push(parser.getObj());
        num = nums[i];
        var entry = this.entries[num];
        if (entry && entry.offset === tableOffset && entry.gen === i) {
          this.cache[num] = entries[i];
        }
      }
      xrefEntry = entries[xrefEntry.gen];
      if (xrefEntry === undefined) {
        error('bad XRef entry for compressed object');
      }
      return xrefEntry;
    },

    fetchIfRefAsync: function XRef_fetchIfRefAsync(obj) {
      if (!isRef(obj)) {
        return Promise.resolve(obj);
      }
      return this.fetchAsync(obj);
    },

    fetchAsync: function XRef_fetchAsync(ref, suppressEncryption) {
      var streamManager = this.stream.manager;
      var xref = this;
      return new Promise(function tryFetch(resolve, reject) {
        try {
          resolve(xref.fetch(ref, suppressEncryption));
        } catch (e) {
          if (e instanceof MissingDataException) {
            streamManager.requestRange(e.begin, e.end).then(function () {
              tryFetch(resolve, reject);
            }, reject);
            return;
          }
          reject(e);
        }
      });
    },

    getCatalogObj: function XRef_getCatalogObj() {
      return this.root;
    }
  };

  return XRef;
})();

/**
 * A NameTree/NumberTree is like a Dict but has some advantageous properties,
 * see the specification (7.9.6 and 7.9.7) for additional details.
 * TODO: implement all the Dict functions and make this more efficient.
 */
var NameOrNumberTree = (function NameOrNumberTreeClosure() {
  function NameOrNumberTree(root, xref) {
    throw new Error('Cannot initialize NameOrNumberTree.');
  }

  NameOrNumberTree.prototype = {
    getAll: function NameOrNumberTree_getAll() {
      var dict = Object.create(null);
      if (!this.root) {
        return dict;
      }
      var xref = this.xref;
      // Reading Name/Number tree.
      var processed = new RefSet();
      processed.put(this.root);
      var queue = [this.root];
      while (queue.length > 0) {
        var i, n;
        var obj = xref.fetchIfRef(queue.shift());
        if (!isDict(obj)) {
          continue;
        }
        if (obj.has('Kids')) {
          var kids = obj.get('Kids');
          for (i = 0, n = kids.length; i < n; i++) {
            var kid = kids[i];
            assert(!processed.has(kid),
                   'Duplicate entry in "' + this._type + '" tree.');
            queue.push(kid);
            processed.put(kid);
          }
          continue;
        }
        var entries = obj.get(this._type);
        if (isArray(entries)) {
          for (i = 0, n = entries.length; i < n; i += 2) {
            dict[xref.fetchIfRef(entries[i])] = xref.fetchIfRef(entries[i + 1]);
          }
        }
      }
      return dict;
    },

    get: function NameOrNumberTree_get(key) {
      if (!this.root) {
        return null;
      }

      var xref = this.xref;
      var kidsOrEntries = xref.fetchIfRef(this.root);
      var loopCount = 0;
      var MAX_LEVELS = 10;
      var l, r, m;

      // Perform a binary search to quickly find the entry that
      // contains the key we are looking for.
      while (kidsOrEntries.has('Kids')) {
        if (++loopCount > MAX_LEVELS) {
          warn('Search depth limit reached for "' + this._type + '" tree.');
          return null;
        }

        var kids = kidsOrEntries.get('Kids');
        if (!isArray(kids)) {
          return null;
        }

        l = 0;
        r = kids.length - 1;
        while (l <= r) {
          m = (l + r) >> 1;
          var kid = xref.fetchIfRef(kids[m]);
          var limits = kid.get('Limits');

          if (key < xref.fetchIfRef(limits[0])) {
            r = m - 1;
          } else if (key > xref.fetchIfRef(limits[1])) {
            l = m + 1;
          } else {
            kidsOrEntries = xref.fetchIfRef(kids[m]);
            break;
          }
        }
        if (l > r) {
          return null;
        }
      }

      // If we get here, then we have found the right entry. Now go through the
      // entries in the dictionary until we find the key we're looking for.
      var entries = kidsOrEntries.get(this._type);
      if (isArray(entries)) {
        // Perform a binary search to reduce the lookup time.
        l = 0;
        r = entries.length - 2;
        while (l <= r) {
          // Check only even indices (0, 2, 4, ...) because the
          // odd indices contain the actual data.
          m = (l + r) & ~1;
          var currentKey = xref.fetchIfRef(entries[m]);
          if (key < currentKey) {
            r = m - 2;
          } else if (key > currentKey) {
            l = m + 2;
          } else {
            return xref.fetchIfRef(entries[m + 1]);
          }
        }
      }
      return null;
    }
  };
  return NameOrNumberTree;
})();

var NameTree = (function NameTreeClosure() {
  function NameTree(root, xref) {
    this.root = root;
    this.xref = xref;
    this._type = 'Names';
  }

  Util.inherit(NameTree, NameOrNumberTree, {});

  return NameTree;
})();

var NumberTree = (function NumberTreeClosure() {
  function NumberTree(root, xref) {
    this.root = root;
    this.xref = xref;
    this._type = 'Nums';
  }

  Util.inherit(NumberTree, NameOrNumberTree, {});

  return NumberTree;
})();

/**
 * "A PDF file can refer to the contents of another file by using a File
 * Specification (PDF 1.1)", see the spec (7.11) for more details.
 * NOTE: Only embedded files are supported (as part of the attachments support)
 * TODO: support the 'URL' file system (with caching if !/V), portable
 * collections attributes and related files (/RF)
 */
var FileSpec = (function FileSpecClosure() {
  function FileSpec(root, xref) {
    if (!root || !isDict(root)) {
      return;
    }
    this.xref = xref;
    this.root = root;
    if (root.has('FS')) {
      this.fs = root.get('FS');
    }
    this.description = root.has('Desc') ?
                         stringToPDFString(root.get('Desc')) :
                         '';
    if (root.has('RF')) {
      warn('Related file specifications are not supported');
    }
    this.contentAvailable = true;
    if (!root.has('EF')) {
      this.contentAvailable = false;
      warn('Non-embedded file specifications are not supported');
    }
  }

  function pickPlatformItem(dict) {
    // Look for the filename in this order:
    // UF, F, Unix, Mac, DOS
    if (dict.has('UF')) {
      return dict.get('UF');
    } else if (dict.has('F')) {
      return dict.get('F');
    } else if (dict.has('Unix')) {
      return dict.get('Unix');
    } else if (dict.has('Mac')) {
      return dict.get('Mac');
    } else if (dict.has('DOS')) {
      return dict.get('DOS');
    } else {
      return null;
    }
  }

  FileSpec.prototype = {
    get filename() {
      if (!this._filename && this.root) {
        var filename = pickPlatformItem(this.root) || 'unnamed';
        this._filename = stringToPDFString(filename).
          replace(/\\\\/g, '\\').
          replace(/\\\//g, '/').
          replace(/\\/g, '/');
      }
      return this._filename;
    },
    get content() {
      if (!this.contentAvailable) {
        return null;
      }
      if (!this.contentRef && this.root) {
        this.contentRef = pickPlatformItem(this.root.get('EF'));
      }
      var content = null;
      if (this.contentRef) {
        var xref = this.xref;
        var fileObj = xref.fetchIfRef(this.contentRef);
        if (fileObj && isStream(fileObj)) {
          content = fileObj.getBytes();
        } else {
          warn('Embedded file specification points to non-existing/invalid ' +
            'content');
        }
      } else {
        warn('Embedded file specification does not have a content');
      }
      return content;
    },
    get serializable() {
      return {
        filename: this.filename,
        content: this.content
      };
    }
  };
  return FileSpec;
})();

/**
 * A helper for loading missing data in object graphs. It traverses the graph
 * depth first and queues up any objects that have missing data. Once it has
 * has traversed as many objects that are available it attempts to bundle the
 * missing data requests and then resume from the nodes that weren't ready.
 *
 * NOTE: It provides protection from circular references by keeping track of
 * of loaded references. However, you must be careful not to load any graphs
 * that have references to the catalog or other pages since that will cause the
 * entire PDF document object graph to be traversed.
 */
var ObjectLoader = (function() {
  function mayHaveChildren(value) {
    return isRef(value) || isDict(value) || isArray(value) || isStream(value);
  }

  function addChildren(node, nodesToVisit) {
    var value;
    if (isDict(node) || isStream(node)) {
      var map;
      if (isDict(node)) {
        map = node.map;
      } else {
        map = node.dict.map;
      }
      for (var key in map) {
        value = map[key];
        if (mayHaveChildren(value)) {
          nodesToVisit.push(value);
        }
      }
    } else if (isArray(node)) {
      for (var i = 0, ii = node.length; i < ii; i++) {
        value = node[i];
        if (mayHaveChildren(value)) {
          nodesToVisit.push(value);
        }
      }
    }
  }

  function ObjectLoader(obj, keys, xref) {
    this.obj = obj;
    this.keys = keys;
    this.xref = xref;
    this.refSet = null;
    this.capability = null;
  }

  ObjectLoader.prototype = {
    load: function ObjectLoader_load() {
      var keys = this.keys;
      this.capability = createPromiseCapability();
      // Don't walk the graph if all the data is already loaded.
      if (!(this.xref.stream instanceof ChunkedStream) ||
          this.xref.stream.getMissingChunks().length === 0) {
        this.capability.resolve();
        return this.capability.promise;
      }

      this.refSet = new RefSet();
      // Setup the initial nodes to visit.
      var nodesToVisit = [];
      for (var i = 0; i < keys.length; i++) {
        nodesToVisit.push(this.obj[keys[i]]);
      }

      this._walk(nodesToVisit);
      return this.capability.promise;
    },

    _walk: function ObjectLoader_walk(nodesToVisit) {
      var nodesToRevisit = [];
      var pendingRequests = [];
      // DFS walk of the object graph.
      while (nodesToVisit.length) {
        var currentNode = nodesToVisit.pop();

        // Only references or chunked streams can cause missing data exceptions.
        if (isRef(currentNode)) {
          // Skip nodes that have already been visited.
          if (this.refSet.has(currentNode)) {
            continue;
          }
          try {
            var ref = currentNode;
            this.refSet.put(ref);
            currentNode = this.xref.fetch(currentNode);
          } catch (e) {
            if (!(e instanceof MissingDataException)) {
              throw e;
            }
            nodesToRevisit.push(currentNode);
            pendingRequests.push({ begin: e.begin, end: e.end });
          }
        }
        if (currentNode && currentNode.getBaseStreams) {
          var baseStreams = currentNode.getBaseStreams();
          var foundMissingData = false;
          for (var i = 0; i < baseStreams.length; i++) {
            var stream = baseStreams[i];
            if (stream.getMissingChunks && stream.getMissingChunks().length) {
              foundMissingData = true;
              pendingRequests.push({
                begin: stream.start,
                end: stream.end
              });
            }
          }
          if (foundMissingData) {
            nodesToRevisit.push(currentNode);
          }
        }

        addChildren(currentNode, nodesToVisit);
      }

      if (pendingRequests.length) {
        this.xref.stream.manager.requestRanges(pendingRequests).then(
            function pendingRequestCallback() {
          nodesToVisit = nodesToRevisit;
          for (var i = 0; i < nodesToRevisit.length; i++) {
            var node = nodesToRevisit[i];
            // Remove any reference nodes from the currrent refset so they
            // aren't skipped when we revist them.
            if (isRef(node)) {
              this.refSet.remove(node);
            }
          }
          this._walk(nodesToVisit);
        }.bind(this), this.capability.reject);
        return;
      }
      // Everything is loaded.
      this.refSet = null;
      this.capability.resolve();
    }
  };

  return ObjectLoader;
})();

exports.Catalog = Catalog;
exports.ObjectLoader = ObjectLoader;
exports.XRef = XRef;
exports.FileSpec = FileSpec;
}));


(function (root, factory) {
  {
    factory((root.pdfjsCorePattern = {}), root.pdfjsSharedUtil,
      root.pdfjsCorePrimitives, root.pdfjsCoreFunction,
      root.pdfjsCoreColorSpace);
  }
}(this, function (exports, sharedUtil, corePrimitives, coreFunction,
                  coreColorSpace) {

var UNSUPPORTED_FEATURES = sharedUtil.UNSUPPORTED_FEATURES;
var MissingDataException = sharedUtil.MissingDataException;
var Util = sharedUtil.Util;
var assert = sharedUtil.assert;
var error = sharedUtil.error;
var info = sharedUtil.info;
var warn = sharedUtil.warn;
var isStream = corePrimitives.isStream;
var PDFFunction = coreFunction.PDFFunction;
var ColorSpace = coreColorSpace.ColorSpace;

var ShadingType = {
  FUNCTION_BASED: 1,
  AXIAL: 2,
  RADIAL: 3,
  FREE_FORM_MESH: 4,
  LATTICE_FORM_MESH: 5,
  COONS_PATCH_MESH: 6,
  TENSOR_PATCH_MESH: 7
};

var Pattern = (function PatternClosure() {
  // Constructor should define this.getPattern
  function Pattern() {
    error('should not call Pattern constructor');
  }

  Pattern.prototype = {
    // Input: current Canvas context
    // Output: the appropriate fillStyle or strokeStyle
    getPattern: function Pattern_getPattern(ctx) {
      error('Should not call Pattern.getStyle: ' + ctx);
    }
  };

  Pattern.parseShading = function Pattern_parseShading(shading, matrix, xref,
                                                       res, handler) {

    var dict = isStream(shading) ? shading.dict : shading;
    var type = dict.get('ShadingType');

    try {
      switch (type) {
        case ShadingType.AXIAL:
        case ShadingType.RADIAL:
          // Both radial and axial shadings are handled by RadialAxial shading.
          return new Shadings.RadialAxial(dict, matrix, xref, res);
        case ShadingType.FREE_FORM_MESH:
        case ShadingType.LATTICE_FORM_MESH:
        case ShadingType.COONS_PATCH_MESH:
        case ShadingType.TENSOR_PATCH_MESH:
          return new Shadings.Mesh(shading, matrix, xref, res);
        default:
          throw new Error('Unsupported ShadingType: ' + type);
      }
    } catch (ex) {
      if (ex instanceof MissingDataException) {
        throw ex;
      }
      handler.send('UnsupportedFeature',
                   {featureId: UNSUPPORTED_FEATURES.shadingPattern});
      warn(ex);
      return new Shadings.Dummy();
    }
  };
  return Pattern;
})();

var Shadings = {};

// A small number to offset the first/last color stops so we can insert ones to
// support extend. Number.MIN_VALUE is too small and breaks the extend.
Shadings.SMALL_NUMBER = 1e-6;

// Radial and axial shading have very similar implementations
// If needed, the implementations can be broken into two classes
Shadings.RadialAxial = (function RadialAxialClosure() {
  function RadialAxial(dict, matrix, xref, res) {
    this.matrix = matrix;
    this.coordsArr = dict.get('Coords');
    this.shadingType = dict.get('ShadingType');
    this.type = 'Pattern';
    var cs = dict.get('ColorSpace', 'CS');
    cs = ColorSpace.parse(cs, xref, res);
    this.cs = cs;

    var t0 = 0.0, t1 = 1.0;
    if (dict.has('Domain')) {
      var domainArr = dict.get('Domain');
      t0 = domainArr[0];
      t1 = domainArr[1];
    }

    var extendStart = false, extendEnd = false;
    if (dict.has('Extend')) {
      var extendArr = dict.get('Extend');
      extendStart = extendArr[0];
      extendEnd = extendArr[1];
    }

    if (this.shadingType === ShadingType.RADIAL &&
       (!extendStart || !extendEnd)) {
      // Radial gradient only currently works if either circle is fully within
      // the other circle.
      var x1 = this.coordsArr[0];
      var y1 = this.coordsArr[1];
      var r1 = this.coordsArr[2];
      var x2 = this.coordsArr[3];
      var y2 = this.coordsArr[4];
      var r2 = this.coordsArr[5];
      var distance = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
      if (r1 <= r2 + distance &&
          r2 <= r1 + distance) {
        warn('Unsupported radial gradient.');
      }
    }

    this.extendStart = extendStart;
    this.extendEnd = extendEnd;

    var fnObj = dict.get('Function');
    var fn = PDFFunction.parseArray(xref, fnObj);

    // 10 samples seems good enough for now, but probably won't work
    // if there are sharp color changes. Ideally, we would implement
    // the spec faithfully and add lossless optimizations.
    var diff = t1 - t0;
    var step = diff / 10;

    var colorStops = this.colorStops = [];

    // Protect against bad domains so we don't end up in an infinte loop below.
    if (t0 >= t1 || step <= 0) {
      // Acrobat doesn't seem to handle these cases so we'll ignore for
      // now.
      info('Bad shading domain.');
      return;
    }

    var color = new Float32Array(cs.numComps), ratio = new Float32Array(1);
    var rgbColor;
    for (var i = t0; i <= t1; i += step) {
      ratio[0] = i;
      fn(ratio, 0, color, 0);
      rgbColor = cs.getRgb(color, 0);
      var cssColor = Util.makeCssRgb(rgbColor[0], rgbColor[1], rgbColor[2]);
      colorStops.push([(i - t0) / diff, cssColor]);
    }

    var background = 'transparent';
    if (dict.has('Background')) {
      rgbColor = cs.getRgb(dict.get('Background'), 0);
      background = Util.makeCssRgb(rgbColor[0], rgbColor[1], rgbColor[2]);
    }

    if (!extendStart) {
      // Insert a color stop at the front and offset the first real color stop
      // so it doesn't conflict with the one we insert.
      colorStops.unshift([0, background]);
      colorStops[1][0] += Shadings.SMALL_NUMBER;
    }
    if (!extendEnd) {
      // Same idea as above in extendStart but for the end.
      colorStops[colorStops.length - 1][0] -= Shadings.SMALL_NUMBER;
      colorStops.push([1, background]);
    }

    this.colorStops = colorStops;
  }

  RadialAxial.prototype = {
    getIR: function RadialAxial_getIR() {
      var coordsArr = this.coordsArr;
      var shadingType = this.shadingType;
      var type, p0, p1, r0, r1;
      if (shadingType === ShadingType.AXIAL) {
        p0 = [coordsArr[0], coordsArr[1]];
        p1 = [coordsArr[2], coordsArr[3]];
        r0 = null;
        r1 = null;
        type = 'axial';
      } else if (shadingType === ShadingType.RADIAL) {
        p0 = [coordsArr[0], coordsArr[1]];
        p1 = [coordsArr[3], coordsArr[4]];
        r0 = coordsArr[2];
        r1 = coordsArr[5];
        type = 'radial';
      } else {
        error('getPattern type unknown: ' + shadingType);
      }

      var matrix = this.matrix;
      if (matrix) {
        p0 = Util.applyTransform(p0, matrix);
        p1 = Util.applyTransform(p1, matrix);
        if (shadingType === ShadingType.RADIAL) {
          var scale = Util.singularValueDecompose2dScale(matrix);
          r0 *= scale[0];
          r1 *= scale[1];
        }
      }

      return ['RadialAxial', type, this.colorStops, p0, p1, r0, r1];
    }
  };

  return RadialAxial;
})();

// All mesh shading. For now, they will be presented as set of the triangles
// to be drawn on the canvas and rgb color for each vertex.
Shadings.Mesh = (function MeshClosure() {
  function MeshStreamReader(stream, context) {
    this.stream = stream;
    this.context = context;
    this.buffer = 0;
    this.bufferLength = 0;

    var numComps = context.numComps;
    this.tmpCompsBuf = new Float32Array(numComps);
    var csNumComps = context.colorSpace.numComps;
    this.tmpCsCompsBuf = context.colorFn ? new Float32Array(csNumComps) :
                                           this.tmpCompsBuf;
  }
  MeshStreamReader.prototype = {
    get hasData() {
      if (this.stream.end) {
        return this.stream.pos < this.stream.end;
      }
      if (this.bufferLength > 0) {
        return true;
      }
      var nextByte = this.stream.getByte();
      if (nextByte < 0) {
        return false;
      }
      this.buffer = nextByte;
      this.bufferLength = 8;
      return true;
    },
    readBits: function MeshStreamReader_readBits(n) {
      var buffer = this.buffer;
      var bufferLength = this.bufferLength;
      if (n === 32) {
        if (bufferLength === 0) {
          return ((this.stream.getByte() << 24) |
            (this.stream.getByte() << 16) | (this.stream.getByte() << 8) |
            this.stream.getByte()) >>> 0;
        }
        buffer = (buffer << 24) | (this.stream.getByte() << 16) |
          (this.stream.getByte() << 8) | this.stream.getByte();
        var nextByte = this.stream.getByte();
        this.buffer = nextByte & ((1 << bufferLength) - 1);
        return ((buffer << (8 - bufferLength)) |
          ((nextByte & 0xFF) >> bufferLength)) >>> 0;
      }
      if (n === 8 && bufferLength === 0) {
        return this.stream.getByte();
      }
      while (bufferLength < n) {
        buffer = (buffer << 8) | this.stream.getByte();
        bufferLength += 8;
      }
      bufferLength -= n;
      this.bufferLength = bufferLength;
      this.buffer = buffer & ((1 << bufferLength) - 1);
      return buffer >> bufferLength;
    },
    align: function MeshStreamReader_align() {
      this.buffer = 0;
      this.bufferLength = 0;
    },
    readFlag: function MeshStreamReader_readFlag() {
      return this.readBits(this.context.bitsPerFlag);
    },
    readCoordinate: function MeshStreamReader_readCoordinate() {
      var bitsPerCoordinate = this.context.bitsPerCoordinate;
      var xi = this.readBits(bitsPerCoordinate);
      var yi = this.readBits(bitsPerCoordinate);
      var decode = this.context.decode;
      var scale = bitsPerCoordinate < 32 ? 1 / ((1 << bitsPerCoordinate) - 1) :
        2.3283064365386963e-10; // 2 ^ -32
      return [
        xi * scale * (decode[1] - decode[0]) + decode[0],
        yi * scale * (decode[3] - decode[2]) + decode[2]
      ];
    },
    readComponents: function MeshStreamReader_readComponents() {
      var numComps = this.context.numComps;
      var bitsPerComponent = this.context.bitsPerComponent;
      var scale = bitsPerComponent < 32 ? 1 / ((1 << bitsPerComponent) - 1) :
        2.3283064365386963e-10; // 2 ^ -32
      var decode = this.context.decode;
      var components = this.tmpCompsBuf;
      for (var i = 0, j = 4; i < numComps; i++, j += 2) {
        var ci = this.readBits(bitsPerComponent);
        components[i] = ci * scale * (decode[j + 1] - decode[j]) + decode[j];
      }
      var color = this.tmpCsCompsBuf;
      if (this.context.colorFn) {
        this.context.colorFn(components, 0, color, 0);
      }
      return this.context.colorSpace.getRgb(color, 0);
    }
  };

  function decodeType4Shading(mesh, reader) {
    var coords = mesh.coords;
    var colors = mesh.colors;
    var operators = [];
    var ps = []; // not maintaining cs since that will match ps
    var verticesLeft = 0; // assuming we have all data to start a new triangle
    while (reader.hasData) {
      var f = reader.readFlag();
      var coord = reader.readCoordinate();
      var color = reader.readComponents();
      if (verticesLeft === 0) { // ignoring flags if we started a triangle
        assert(0 <= f && f <= 2, 'Unknown type4 flag');
        switch (f) {
          case 0:
            verticesLeft = 3;
            break;
          case 1:
            ps.push(ps[ps.length - 2], ps[ps.length - 1]);
            verticesLeft = 1;
            break;
          case 2:
            ps.push(ps[ps.length - 3], ps[ps.length - 1]);
            verticesLeft = 1;
            break;
        }
        operators.push(f);
      }
      ps.push(coords.length);
      coords.push(coord);
      colors.push(color);
      verticesLeft--;

      reader.align();
    }
    mesh.figures.push({
      type: 'triangles',
      coords: new Int32Array(ps),
      colors: new Int32Array(ps),
    });
  }

  function decodeType5Shading(mesh, reader, verticesPerRow) {
    var coords = mesh.coords;
    var colors = mesh.colors;
    var ps = []; // not maintaining cs since that will match ps
    while (reader.hasData) {
      var coord = reader.readCoordinate();
      var color = reader.readComponents();
      ps.push(coords.length);
      coords.push(coord);
      colors.push(color);
    }
    mesh.figures.push({
      type: 'lattice',
      coords: new Int32Array(ps),
      colors: new Int32Array(ps),
      verticesPerRow: verticesPerRow
    });
  }

  var MIN_SPLIT_PATCH_CHUNKS_AMOUNT = 3;
  var MAX_SPLIT_PATCH_CHUNKS_AMOUNT = 20;

  var TRIANGLE_DENSITY = 20; // count of triangles per entire mesh bounds

  var getB = (function getBClosure() {
    function buildB(count) {
      var lut = [];
      for (var i = 0; i <= count; i++) {
        var t = i / count, t_ = 1 - t;
        lut.push(new Float32Array([t_ * t_ * t_, 3 * t * t_ * t_,
          3 * t * t * t_, t * t * t]));
      }
      return lut;
    }
    var cache = [];
    return function getB(count) {
      if (!cache[count]) {
        cache[count] = buildB(count);
      }
      return cache[count];
    };
  })();

  function buildFigureFromPatch(mesh, index) {
    var figure = mesh.figures[index];
    assert(figure.type === 'patch', 'Unexpected patch mesh figure');

    var coords = mesh.coords, colors = mesh.colors;
    var pi = figure.coords;
    var ci = figure.colors;

    var figureMinX = Math.min(coords[pi[0]][0], coords[pi[3]][0],
                              coords[pi[12]][0], coords[pi[15]][0]);
    var figureMinY = Math.min(coords[pi[0]][1], coords[pi[3]][1],
                              coords[pi[12]][1], coords[pi[15]][1]);
    var figureMaxX = Math.max(coords[pi[0]][0], coords[pi[3]][0],
                              coords[pi[12]][0], coords[pi[15]][0]);
    var figureMaxY = Math.max(coords[pi[0]][1], coords[pi[3]][1],
                              coords[pi[12]][1], coords[pi[15]][1]);
    var splitXBy = Math.ceil((figureMaxX - figureMinX) * TRIANGLE_DENSITY /
                             (mesh.bounds[2] - mesh.bounds[0]));
    splitXBy = Math.max(MIN_SPLIT_PATCH_CHUNKS_AMOUNT,
               Math.min(MAX_SPLIT_PATCH_CHUNKS_AMOUNT, splitXBy));
    var splitYBy = Math.ceil((figureMaxY - figureMinY) * TRIANGLE_DENSITY /
                             (mesh.bounds[3] - mesh.bounds[1]));
    splitYBy = Math.max(MIN_SPLIT_PATCH_CHUNKS_AMOUNT,
               Math.min(MAX_SPLIT_PATCH_CHUNKS_AMOUNT, splitYBy));

    var verticesPerRow = splitXBy + 1;
    var figureCoords = new Int32Array((splitYBy + 1) * verticesPerRow);
    var figureColors = new Int32Array((splitYBy + 1) * verticesPerRow);
    var k = 0;
    var cl = new Uint8Array(3), cr = new Uint8Array(3);
    var c0 = colors[ci[0]], c1 = colors[ci[1]],
      c2 = colors[ci[2]], c3 = colors[ci[3]];
    var bRow = getB(splitYBy), bCol = getB(splitXBy);
    for (var row = 0; row <= splitYBy; row++) {
      cl[0] = ((c0[0] * (splitYBy - row) + c2[0] * row) / splitYBy) | 0;
      cl[1] = ((c0[1] * (splitYBy - row) + c2[1] * row) / splitYBy) | 0;
      cl[2] = ((c0[2] * (splitYBy - row) + c2[2] * row) / splitYBy) | 0;

      cr[0] = ((c1[0] * (splitYBy - row) + c3[0] * row) / splitYBy) | 0;
      cr[1] = ((c1[1] * (splitYBy - row) + c3[1] * row) / splitYBy) | 0;
      cr[2] = ((c1[2] * (splitYBy - row) + c3[2] * row) / splitYBy) | 0;

      for (var col = 0; col <= splitXBy; col++, k++) {
        if ((row === 0 || row === splitYBy) &&
            (col === 0 || col === splitXBy)) {
          continue;
        }
        var x = 0, y = 0;
        var q = 0;
        for (var i = 0; i <= 3; i++) {
          for (var j = 0; j <= 3; j++, q++) {
            var m = bRow[row][i] * bCol[col][j];
            x += coords[pi[q]][0] * m;
            y += coords[pi[q]][1] * m;
          }
        }
        figureCoords[k] = coords.length;
        coords.push([x, y]);
        figureColors[k] = colors.length;
        var newColor = new Uint8Array(3);
        newColor[0] = ((cl[0] * (splitXBy - col) + cr[0] * col) / splitXBy) | 0;
        newColor[1] = ((cl[1] * (splitXBy - col) + cr[1] * col) / splitXBy) | 0;
        newColor[2] = ((cl[2] * (splitXBy - col) + cr[2] * col) / splitXBy) | 0;
        colors.push(newColor);
      }
    }
    figureCoords[0] = pi[0];
    figureColors[0] = ci[0];
    figureCoords[splitXBy] = pi[3];
    figureColors[splitXBy] = ci[1];
    figureCoords[verticesPerRow * splitYBy] = pi[12];
    figureColors[verticesPerRow * splitYBy] = ci[2];
    figureCoords[verticesPerRow * splitYBy + splitXBy] = pi[15];
    figureColors[verticesPerRow * splitYBy + splitXBy] = ci[3];

    mesh.figures[index] = {
      type: 'lattice',
      coords: figureCoords,
      colors: figureColors,
      verticesPerRow: verticesPerRow
    };
  }

  function decodeType6Shading(mesh, reader) {
    // A special case of Type 7. The p11, p12, p21, p22 automatically filled
    var coords = mesh.coords;
    var colors = mesh.colors;
    var ps = new Int32Array(16); // p00, p10, ..., p30, p01, ..., p33
    var cs = new Int32Array(4); // c00, c30, c03, c33
    while (reader.hasData) {
      var f = reader.readFlag();
      assert(0 <= f && f <= 3, 'Unknown type6 flag');
      var i, ii;
      var pi = coords.length;
      for (i = 0, ii = (f !== 0 ? 8 : 12); i < ii; i++) {
        coords.push(reader.readCoordinate());
      }
      var ci = colors.length;
      for (i = 0, ii = (f !== 0 ? 2 : 4); i < ii; i++) {
        colors.push(reader.readComponents());
      }
      var tmp1, tmp2, tmp3, tmp4;
      switch (f) {
        case 0:
          ps[12] = pi + 3; ps[13] = pi + 4;  ps[14] = pi + 5;  ps[15] = pi + 6;
          ps[ 8] = pi + 2; /* values for 5, 6, 9, 10 are    */ ps[11] = pi + 7;
          ps[ 4] = pi + 1; /* calculated below              */ ps[ 7] = pi + 8;
          ps[ 0] = pi;     ps[ 1] = pi + 11; ps[ 2] = pi + 10; ps[ 3] = pi + 9;
          cs[2] = ci + 1; cs[3] = ci + 2;
          cs[0] = ci;     cs[1] = ci + 3;
          break;
        case 1:
          tmp1 = ps[12]; tmp2 = ps[13]; tmp3 = ps[14]; tmp4 = ps[15];
          ps[12] = tmp4; ps[13] = pi + 0;  ps[14] = pi + 1;  ps[15] = pi + 2;
          ps[ 8] = tmp3; /* values for 5, 6, 9, 10 are    */ ps[11] = pi + 3;
          ps[ 4] = tmp2; /* calculated below              */ ps[ 7] = pi + 4;
          ps[ 0] = tmp1; ps[ 1] = pi + 7;   ps[ 2] = pi + 6; ps[ 3] = pi + 5;
          tmp1 = cs[2]; tmp2 = cs[3];
          cs[2] = tmp2;   cs[3] = ci;
          cs[0] = tmp1;   cs[1] = ci + 1;
          break;
        case 2:
          tmp1 = ps[15];
          tmp2 = ps[11];
          ps[12] = ps[3];  ps[13] = pi + 0; ps[14] = pi + 1;   ps[15] = pi + 2;
          ps[ 8] = ps[7];  /* values for 5, 6, 9, 10 are    */ ps[11] = pi + 3;
          ps[ 4] = tmp2;   /* calculated below              */ ps[ 7] = pi + 4;
          ps[ 0] = tmp1;  ps[ 1] = pi + 7;   ps[ 2] = pi + 6;  ps[ 3] = pi + 5;
          tmp1 = cs[3];
          cs[2] = cs[1]; cs[3] = ci;
          cs[0] = tmp1;  cs[1] = ci + 1;
          break;
        case 3:
          ps[12] = ps[0];  ps[13] = pi + 0;   ps[14] = pi + 1; ps[15] = pi + 2;
          ps[ 8] = ps[1];  /* values for 5, 6, 9, 10 are    */ ps[11] = pi + 3;
          ps[ 4] = ps[2];  /* calculated below              */ ps[ 7] = pi + 4;
          ps[ 0] = ps[3];  ps[ 1] = pi + 7;   ps[ 2] = pi + 6; ps[ 3] = pi + 5;
          cs[2] = cs[0]; cs[3] = ci;
          cs[0] = cs[1]; cs[1] = ci + 1;
          break;
      }
      // set p11, p12, p21, p22
      ps[5] = coords.length;
      coords.push([
        (-4 * coords[ps[0]][0] - coords[ps[15]][0] +
          6 * (coords[ps[4]][0] + coords[ps[1]][0]) -
          2 * (coords[ps[12]][0] + coords[ps[3]][0]) +
          3 * (coords[ps[13]][0] + coords[ps[7]][0])) / 9,
        (-4 * coords[ps[0]][1] - coords[ps[15]][1] +
          6 * (coords[ps[4]][1] + coords[ps[1]][1]) -
          2 * (coords[ps[12]][1] + coords[ps[3]][1]) +
          3 * (coords[ps[13]][1] + coords[ps[7]][1])) / 9
      ]);
      ps[6] = coords.length;
      coords.push([
        (-4 * coords[ps[3]][0] - coords[ps[12]][0] +
          6 * (coords[ps[2]][0] + coords[ps[7]][0]) -
          2 * (coords[ps[0]][0] + coords[ps[15]][0]) +
          3 * (coords[ps[4]][0] + coords[ps[14]][0])) / 9,
        (-4 * coords[ps[3]][1] - coords[ps[12]][1] +
          6 * (coords[ps[2]][1] + coords[ps[7]][1]) -
          2 * (coords[ps[0]][1] + coords[ps[15]][1]) +
          3 * (coords[ps[4]][1] + coords[ps[14]][1])) / 9
      ]);
      ps[9] = coords.length;
      coords.push([
        (-4 * coords[ps[12]][0] - coords[ps[3]][0] +
          6 * (coords[ps[8]][0] + coords[ps[13]][0]) -
          2 * (coords[ps[0]][0] + coords[ps[15]][0]) +
          3 * (coords[ps[11]][0] + coords[ps[1]][0])) / 9,
        (-4 * coords[ps[12]][1] - coords[ps[3]][1] +
          6 * (coords[ps[8]][1] + coords[ps[13]][1]) -
          2 * (coords[ps[0]][1] + coords[ps[15]][1]) +
          3 * (coords[ps[11]][1] + coords[ps[1]][1])) / 9
      ]);
      ps[10] = coords.length;
      coords.push([
        (-4 * coords[ps[15]][0] - coords[ps[0]][0] +
          6 * (coords[ps[11]][0] + coords[ps[14]][0]) -
          2 * (coords[ps[12]][0] + coords[ps[3]][0]) +
          3 * (coords[ps[2]][0] + coords[ps[8]][0])) / 9,
        (-4 * coords[ps[15]][1] - coords[ps[0]][1] +
          6 * (coords[ps[11]][1] + coords[ps[14]][1]) -
          2 * (coords[ps[12]][1] + coords[ps[3]][1]) +
          3 * (coords[ps[2]][1] + coords[ps[8]][1])) / 9
      ]);
      mesh.figures.push({
        type: 'patch',
        coords: new Int32Array(ps), // making copies of ps and cs
        colors: new Int32Array(cs)
      });
    }
  }

  function decodeType7Shading(mesh, reader) {
    var coords = mesh.coords;
    var colors = mesh.colors;
    var ps = new Int32Array(16); // p00, p10, ..., p30, p01, ..., p33
    var cs = new Int32Array(4); // c00, c30, c03, c33
    while (reader.hasData) {
      var f = reader.readFlag();
      assert(0 <= f && f <= 3, 'Unknown type7 flag');
      var i, ii;
      var pi = coords.length;
      for (i = 0, ii = (f !== 0 ? 12 : 16); i < ii; i++) {
        coords.push(reader.readCoordinate());
      }
      var ci = colors.length;
      for (i = 0, ii = (f !== 0 ? 2 : 4); i < ii; i++) {
        colors.push(reader.readComponents());
      }
      var tmp1, tmp2, tmp3, tmp4;
      switch (f) {
        case 0:
          ps[12] = pi + 3; ps[13] = pi + 4;  ps[14] = pi + 5;  ps[15] = pi + 6;
          ps[ 8] = pi + 2; ps[ 9] = pi + 13; ps[10] = pi + 14; ps[11] = pi + 7;
          ps[ 4] = pi + 1; ps[ 5] = pi + 12; ps[ 6] = pi + 15; ps[ 7] = pi + 8;
          ps[ 0] = pi;     ps[ 1] = pi + 11; ps[ 2] = pi + 10; ps[ 3] = pi + 9;
          cs[2] = ci + 1; cs[3] = ci + 2;
          cs[0] = ci;     cs[1] = ci + 3;
          break;
        case 1:
          tmp1 = ps[12]; tmp2 = ps[13]; tmp3 = ps[14]; tmp4 = ps[15];
          ps[12] = tmp4;   ps[13] = pi + 0;  ps[14] = pi + 1;  ps[15] = pi + 2;
          ps[ 8] = tmp3;   ps[ 9] = pi + 9;  ps[10] = pi + 10; ps[11] = pi + 3;
          ps[ 4] = tmp2;   ps[ 5] = pi + 8;  ps[ 6] = pi + 11; ps[ 7] = pi + 4;
          ps[ 0] = tmp1;   ps[ 1] = pi + 7;  ps[ 2] = pi + 6;  ps[ 3] = pi + 5;
          tmp1 = cs[2]; tmp2 = cs[3];
          cs[2] = tmp2;   cs[3] = ci;
          cs[0] = tmp1;   cs[1] = ci + 1;
          break;
        case 2:
          tmp1 = ps[15];
          tmp2 = ps[11];
          ps[12] = ps[3]; ps[13] = pi + 0; ps[14] = pi + 1;  ps[15] = pi + 2;
          ps[ 8] = ps[7]; ps[ 9] = pi + 9; ps[10] = pi + 10; ps[11] = pi + 3;
          ps[ 4] = tmp2;  ps[ 5] = pi + 8; ps[ 6] = pi + 11; ps[ 7] = pi + 4;
          ps[ 0] = tmp1;  ps[ 1] = pi + 7; ps[ 2] = pi + 6;  ps[ 3] = pi + 5;
          tmp1 = cs[3];
          cs[2] = cs[1]; cs[3] = ci;
          cs[0] = tmp1;  cs[1] = ci + 1;
          break;
        case 3:
          ps[12] = ps[0];  ps[13] = pi + 0;  ps[14] = pi + 1;  ps[15] = pi + 2;
          ps[ 8] = ps[1];  ps[ 9] = pi + 9;  ps[10] = pi + 10; ps[11] = pi + 3;
          ps[ 4] = ps[2];  ps[ 5] = pi + 8;  ps[ 6] = pi + 11; ps[ 7] = pi + 4;
          ps[ 0] = ps[3];  ps[ 1] = pi + 7;  ps[ 2] = pi + 6;  ps[ 3] = pi + 5;
          cs[2] = cs[0]; cs[3] = ci;
          cs[0] = cs[1]; cs[1] = ci + 1;
          break;
      }
      mesh.figures.push({
        type: 'patch',
        coords: new Int32Array(ps), // making copies of ps and cs
        colors: new Int32Array(cs)
      });
    }
  }

  function updateBounds(mesh) {
    var minX = mesh.coords[0][0], minY = mesh.coords[0][1],
      maxX = minX, maxY = minY;
    for (var i = 1, ii = mesh.coords.length; i < ii; i++) {
      var x = mesh.coords[i][0], y = mesh.coords[i][1];
      minX = minX > x ? x : minX;
      minY = minY > y ? y : minY;
      maxX = maxX < x ? x : maxX;
      maxY = maxY < y ? y : maxY;
    }
    mesh.bounds = [minX, minY, maxX, maxY];
  }

  function packData(mesh) {
    var i, ii, j, jj;

    var coords = mesh.coords;
    var coordsPacked = new Float32Array(coords.length * 2);
    for (i = 0, j = 0, ii = coords.length; i < ii; i++) {
      var xy = coords[i];
      coordsPacked[j++] = xy[0];
      coordsPacked[j++] = xy[1];
    }
    mesh.coords = coordsPacked;

    var colors = mesh.colors;
    var colorsPacked = new Uint8Array(colors.length * 3);
    for (i = 0, j = 0, ii = colors.length; i < ii; i++) {
      var c = colors[i];
      colorsPacked[j++] = c[0];
      colorsPacked[j++] = c[1];
      colorsPacked[j++] = c[2];
    }
    mesh.colors = colorsPacked;

    var figures = mesh.figures;
    for (i = 0, ii = figures.length; i < ii; i++) {
      var figure = figures[i], ps = figure.coords, cs = figure.colors;
      for (j = 0, jj = ps.length; j < jj; j++) {
        ps[j] *= 2;
        cs[j] *= 3;
      }
    }
  }

  function Mesh(stream, matrix, xref, res) {
    assert(isStream(stream), 'Mesh data is not a stream');
    var dict = stream.dict;
    this.matrix = matrix;
    this.shadingType = dict.get('ShadingType');
    this.type = 'Pattern';
    this.bbox = dict.get('BBox');
    var cs = dict.get('ColorSpace', 'CS');
    cs = ColorSpace.parse(cs, xref, res);
    this.cs = cs;
    this.background = dict.has('Background') ?
      cs.getRgb(dict.get('Background'), 0) : null;

    var fnObj = dict.get('Function');
    var fn = fnObj ? PDFFunction.parseArray(xref, fnObj) : null;

    this.coords = [];
    this.colors = [];
    this.figures = [];

    var decodeContext = {
      bitsPerCoordinate: dict.get('BitsPerCoordinate'),
      bitsPerComponent: dict.get('BitsPerComponent'),
      bitsPerFlag: dict.get('BitsPerFlag'),
      decode: dict.get('Decode'),
      colorFn: fn,
      colorSpace: cs,
      numComps: fn ? 1 : cs.numComps
    };
    var reader = new MeshStreamReader(stream, decodeContext);

    var patchMesh = false;
    switch (this.shadingType) {
      case ShadingType.FREE_FORM_MESH:
        decodeType4Shading(this, reader);
        break;
      case ShadingType.LATTICE_FORM_MESH:
        var verticesPerRow = dict.get('VerticesPerRow') | 0;
        assert(verticesPerRow >= 2, 'Invalid VerticesPerRow');
        decodeType5Shading(this, reader, verticesPerRow);
        break;
      case ShadingType.COONS_PATCH_MESH:
        decodeType6Shading(this, reader);
        patchMesh = true;
        break;
      case ShadingType.TENSOR_PATCH_MESH:
        decodeType7Shading(this, reader);
        patchMesh = true;
        break;
      default:
        error('Unsupported mesh type.');
        break;
    }

    if (patchMesh) {
      // dirty bounds calculation for determining, how dense shall be triangles
      updateBounds(this);
      for (var i = 0, ii = this.figures.length; i < ii; i++) {
        buildFigureFromPatch(this, i);
      }
    }
    // calculate bounds
    updateBounds(this);

    packData(this);
  }

  Mesh.prototype = {
    getIR: function Mesh_getIR() {
      return ['Mesh', this.shadingType, this.coords, this.colors, this.figures,
        this.bounds, this.matrix, this.bbox, this.background];
    }
  };

  return Mesh;
})();

Shadings.Dummy = (function DummyClosure() {
  function Dummy() {
    this.type = 'Pattern';
  }

  Dummy.prototype = {
    getIR: function Dummy_getIR() {
      return ['Dummy'];
    }
  };
  return Dummy;
})();

function getTilingPatternIR(operatorList, dict, args) {
  var matrix = dict.get('Matrix');
  var bbox = dict.get('BBox');
  var xstep = dict.get('XStep');
  var ystep = dict.get('YStep');
  var paintType = dict.get('PaintType');
  var tilingType = dict.get('TilingType');

  return [
    'TilingPattern', args, operatorList, matrix, bbox, xstep, ystep,
    paintType, tilingType
  ];
}

exports.Pattern = Pattern;
exports.getTilingPatternIR = getTilingPatternIR;
}));


(function (root, factory) {
  {
    factory((root.pdfjsCoreEvaluator = {}), root.pdfjsSharedUtil,
      root.pdfjsCorePrimitives, root.pdfjsCoreStream, root.pdfjsCoreParser,
      root.pdfjsCoreImage, root.pdfjsCoreColorSpace, root.pdfjsCoreMurmurHash3,
      root.pdfjsCoreFonts, root.pdfjsCoreFunction, root.pdfjsCorePattern,
      root.pdfjsCoreCMap, root.pdfjsCoreMetrics, root.pdfjsCoreBidi,
      root.pdfjsCoreEncodings, root.pdfjsCoreStandardFonts,
      root.pdfjsCoreUnicode, root.pdfjsCoreGlyphList);
  }
}(this, function (exports, sharedUtil, corePrimitives, coreStream, coreParser,
                  coreImage, coreColorSpace, coreMurmurHash3, coreFonts,
                  coreFunction, corePattern, coreCMap, coreMetrics, coreBidi,
                  coreEncodings, coreStandardFonts, coreUnicode,
                  coreGlyphList) {

var FONT_IDENTITY_MATRIX = sharedUtil.FONT_IDENTITY_MATRIX;
var IDENTITY_MATRIX = sharedUtil.IDENTITY_MATRIX;
var UNSUPPORTED_FEATURES = sharedUtil.UNSUPPORTED_FEATURES;
var ImageKind = sharedUtil.ImageKind;
var OPS = sharedUtil.OPS;
var TextRenderingMode = sharedUtil.TextRenderingMode;
var Util = sharedUtil.Util;
var assert = sharedUtil.assert;
var createPromiseCapability = sharedUtil.createPromiseCapability;
var error = sharedUtil.error;
var info = sharedUtil.info;
var isArray = sharedUtil.isArray;
var isNum = sharedUtil.isNum;
var isString = sharedUtil.isString;
var getLookupTableFactory = sharedUtil.getLookupTableFactory;
var warn = sharedUtil.warn;
var Dict = corePrimitives.Dict;
var Name = corePrimitives.Name;
var isCmd = corePrimitives.isCmd;
var isDict = corePrimitives.isDict;
var isName = corePrimitives.isName;
var isRef = corePrimitives.isRef;
var isStream = corePrimitives.isStream;
var DecodeStream = coreStream.DecodeStream;
var JpegStream = coreStream.JpegStream;
var Stream = coreStream.Stream;
var Lexer = coreParser.Lexer;
var Parser = coreParser.Parser;
var isEOF = coreParser.isEOF;
var PDFImage = coreImage.PDFImage;
var ColorSpace = coreColorSpace.ColorSpace;
var MurmurHash3_64 = coreMurmurHash3.MurmurHash3_64;
var ErrorFont = coreFonts.ErrorFont;
var FontFlags = coreFonts.FontFlags;
var Font = coreFonts.Font;
var IdentityToUnicodeMap = coreFonts.IdentityToUnicodeMap;
var ToUnicodeMap = coreFonts.ToUnicodeMap;
var getFontType = coreFonts.getFontType;
var isPDFFunction = coreFunction.isPDFFunction;
var PDFFunction = coreFunction.PDFFunction;
var Pattern = corePattern.Pattern;
var getTilingPatternIR = corePattern.getTilingPatternIR;
var CMapFactory = coreCMap.CMapFactory;
var IdentityCMap = coreCMap.IdentityCMap;
var getMetrics = coreMetrics.getMetrics;
var bidi = coreBidi.bidi;
var WinAnsiEncoding = coreEncodings.WinAnsiEncoding;
var StandardEncoding = coreEncodings.StandardEncoding;
var MacRomanEncoding = coreEncodings.MacRomanEncoding;
var SymbolSetEncoding = coreEncodings.SymbolSetEncoding;
var ZapfDingbatsEncoding = coreEncodings.ZapfDingbatsEncoding;
var getEncoding = coreEncodings.getEncoding;
var getStdFontMap = coreStandardFonts.getStdFontMap;
var getSerifFonts = coreStandardFonts.getSerifFonts;
var getSymbolsFonts = coreStandardFonts.getSymbolsFonts;
var getNormalizedUnicodes = coreUnicode.getNormalizedUnicodes;
var reverseIfRtl = coreUnicode.reverseIfRtl;
var getUnicodeForGlyph = coreUnicode.getUnicodeForGlyph;
var getGlyphsUnicode = coreGlyphList.getGlyphsUnicode;

var PartialEvaluator = (function PartialEvaluatorClosure() {
  var DefaultPartialEvaluatorOptions = {
    forceDataSchema: false,
    maxImageSize: -1,
    disableFontFace: false,
    cMapOptions: { url: null, packed: false }
  };

  function NativeImageDecoder(xref, resources, handler, forceDataSchema) {
    this.xref = xref;
    this.resources = resources;
    this.handler = handler;
    this.forceDataSchema = forceDataSchema;
  }
  NativeImageDecoder.prototype = {
    canDecode: function (image) {
      return image instanceof JpegStream &&
             NativeImageDecoder.isDecodable(image, this.xref, this.resources);
    },
    decode: function (image) {
      // For natively supported JPEGs send them to the main thread for decoding.
      var dict = image.dict;
      var colorSpace = dict.get('ColorSpace', 'CS');
      colorSpace = ColorSpace.parse(colorSpace, this.xref, this.resources);
      var numComps = colorSpace.numComps;
      var decodePromise = this.handler.sendWithPromise('JpegDecode',
        [image.getIR(this.forceDataSchema), numComps]);
      return decodePromise.then(function (message) {
        var data = message.data;
        return new Stream(data, 0, data.length, image.dict);
      });
    }
  };
  /**
   * Checks if the image can be decoded and displayed by the browser without any
   * further processing such as color space conversions.
   */
  NativeImageDecoder.isSupported =
      function NativeImageDecoder_isSupported(image, xref, res) {
    var cs = ColorSpace.parse(image.dict.get('ColorSpace', 'CS'), xref, res);
    return (cs.name === 'DeviceGray' || cs.name === 'DeviceRGB') &&
           cs.isDefaultDecode(image.dict.get('Decode', 'D'));
  };
  /**
   * Checks if the image can be decoded by the browser.
   */
  NativeImageDecoder.isDecodable =
      function NativeImageDecoder_isDecodable(image, xref, res) {
    var cs = ColorSpace.parse(image.dict.get('ColorSpace', 'CS'), xref, res);
    return (cs.numComps === 1 || cs.numComps === 3) &&
           cs.isDefaultDecode(image.dict.get('Decode', 'D'));
  };

  function PartialEvaluator(pdfManager, xref, handler, pageIndex,
                            uniquePrefix, idCounters, fontCache, options) {
    this.pdfManager = pdfManager;
    this.xref = xref;
    this.handler = handler;
    this.pageIndex = pageIndex;
    this.uniquePrefix = uniquePrefix;
    this.idCounters = idCounters;
    this.fontCache = fontCache;
    this.options = options || DefaultPartialEvaluatorOptions;
  }

  // Trying to minimize Date.now() usage and check every 100 time
  var TIME_SLOT_DURATION_MS = 20;
  var CHECK_TIME_EVERY = 100;
  function TimeSlotManager() {
    this.reset();
  }
  TimeSlotManager.prototype = {
    check: function TimeSlotManager_check() {
      if (++this.checked < CHECK_TIME_EVERY) {
        return false;
      }
      this.checked = 0;
      return this.endTime <= Date.now();
    },
    reset: function TimeSlotManager_reset() {
      this.endTime = Date.now() + TIME_SLOT_DURATION_MS;
      this.checked = 0;
    }
  };

  var deferred = Promise.resolve();

  var TILING_PATTERN = 1, SHADING_PATTERN = 2;

  PartialEvaluator.prototype = {
    hasBlendModes: function PartialEvaluator_hasBlendModes(resources) {
      if (!isDict(resources)) {
        return false;
      }

      var processed = Object.create(null);
      if (resources.objId) {
        processed[resources.objId] = true;
      }

      var nodes = [resources], xref = this.xref;
      while (nodes.length) {
        var key, i, ii;
        var node = nodes.shift();
        // First check the current resources for blend modes.
        var graphicStates = node.get('ExtGState');
        if (isDict(graphicStates)) {
          var graphicStatesKeys = graphicStates.getKeys();
          for (i = 0, ii = graphicStatesKeys.length; i < ii; i++) {
            key = graphicStatesKeys[i];

            var graphicState = graphicStates.get(key);
            var bm = graphicState.get('BM');
            if (isName(bm) && bm.name !== 'Normal') {
              return true;
            }
          }
        }
        // Descend into the XObjects to look for more resources and blend modes.
        var xObjects = node.get('XObject');
        if (!isDict(xObjects)) {
          continue;
        }
        var xObjectsKeys = xObjects.getKeys();
        for (i = 0, ii = xObjectsKeys.length; i < ii; i++) {
          key = xObjectsKeys[i];

          var xObject = xObjects.getRaw(key);
          if (isRef(xObject)) {
            if (processed[xObject.toString()]) {
              // The XObject has already been processed, and by avoiding a
              // redundant `xref.fetch` we can *significantly* reduce the load
              // time for badly generated PDF files (fixes issue6961.pdf).
              continue;
            }
            xObject = xref.fetch(xObject);
          }
          if (!isStream(xObject)) {
            continue;
          }
          if (xObject.dict.objId) {
            if (processed[xObject.dict.objId]) {
              // stream has objId and is processed already
              continue;
            }
            processed[xObject.dict.objId] = true;
          }
          var xResources = xObject.dict.get('Resources');
          // Checking objId to detect an infinite loop.
          if (isDict(xResources) &&
              (!xResources.objId || !processed[xResources.objId])) {
            nodes.push(xResources);
            if (xResources.objId) {
              processed[xResources.objId] = true;
            }
          }
        }
      }
      return false;
    },

    buildFormXObject: function PartialEvaluator_buildFormXObject(resources,
                                                                 xobj, smask,
                                                                 operatorList,
                                                                 task,
                                                                 initialState) {
      var matrix = xobj.dict.getArray('Matrix');
      var bbox = xobj.dict.getArray('BBox');
      var group = xobj.dict.get('Group');
      if (group) {
        var groupOptions = {
          matrix: matrix,
          bbox: bbox,
          smask: smask,
          isolated: false,
          knockout: false
        };

        var groupSubtype = group.get('S');
        var colorSpace;
        if (isName(groupSubtype) && groupSubtype.name === 'Transparency') {
          groupOptions.isolated = (group.get('I') || false);
          groupOptions.knockout = (group.get('K') || false);
          colorSpace = (group.has('CS') ?
            ColorSpace.parse(group.get('CS'), this.xref, resources) : null);
        }

        if (smask && smask.backdrop) {
          colorSpace = colorSpace || ColorSpace.singletons.rgb;
          smask.backdrop = colorSpace.getRgb(smask.backdrop, 0);
        }

        operatorList.addOp(OPS.beginGroup, [groupOptions]);
      }

      operatorList.addOp(OPS.paintFormXObjectBegin, [matrix, bbox]);

      return this.getOperatorList(xobj, task,
        (xobj.dict.get('Resources') || resources), operatorList, initialState).
        then(function () {
          operatorList.addOp(OPS.paintFormXObjectEnd, []);

          if (group) {
            operatorList.addOp(OPS.endGroup, [groupOptions]);
          }
        });
    },

    buildPaintImageXObject:
        function PartialEvaluator_buildPaintImageXObject(resources, image,
                                                         inline, operatorList,
                                                         cacheKey, imageCache) {
      var self = this;
      var dict = image.dict;
      var w = dict.get('Width', 'W');
      var h = dict.get('Height', 'H');

      if (!(w && isNum(w)) || !(h && isNum(h))) {
        warn('Image dimensions are missing, or not numbers.');
        return;
      }
      var maxImageSize = this.options.maxImageSize;
      if (maxImageSize !== -1 && w * h > maxImageSize) {
        warn('Image exceeded maximum allowed size and was removed.');
        return;
      }

      var imageMask = (dict.get('ImageMask', 'IM') || false);
      var imgData, args;
      if (imageMask) {
        // This depends on a tmpCanvas being filled with the
        // current fillStyle, such that processing the pixel
        // data can't be done here. Instead of creating a
        // complete PDFImage, only read the information needed
        // for later.

        var width = dict.get('Width', 'W');
        var height = dict.get('Height', 'H');
        var bitStrideLength = (width + 7) >> 3;
        var imgArray = image.getBytes(bitStrideLength * height);
        var decode = dict.get('Decode', 'D');
        var inverseDecode = (!!decode && decode[0] > 0);

        imgData = PDFImage.createMask(imgArray, width, height,
                                      image instanceof DecodeStream,
                                      inverseDecode);
        imgData.cached = true;
        args = [imgData];
        operatorList.addOp(OPS.paintImageMaskXObject, args);
        if (cacheKey) {
          imageCache[cacheKey] = {
            fn: OPS.paintImageMaskXObject,
            args: args
          };
        }
        return;
      }

      var softMask = (dict.get('SMask', 'SM') || false);
      var mask = (dict.get('Mask') || false);

      var SMALL_IMAGE_DIMENSIONS = 200;
      // Inlining small images into the queue as RGB data
      if (inline && !softMask && !mask && !(image instanceof JpegStream) &&
          (w + h) < SMALL_IMAGE_DIMENSIONS) {
        var imageObj = new PDFImage(this.xref, resources, image,
                                    inline, null, null);
        // We force the use of RGBA_32BPP images here, because we can't handle
        // any other kind.
        imgData = imageObj.createImageData(/* forceRGBA = */ true);
        operatorList.addOp(OPS.paintInlineImageXObject, [imgData]);
        return;
      }

      // If there is no imageMask, create the PDFImage and a lot
      // of image processing can be done here.
      var uniquePrefix = (this.uniquePrefix || '');
      var objId = 'img_' + uniquePrefix + (++this.idCounters.obj);
      operatorList.addDependency(objId);
      args = [objId, w, h];

      if (!softMask && !mask && image instanceof JpegStream &&
          NativeImageDecoder.isSupported(image, this.xref, resources)) {
        // These JPEGs don't need any more processing so we can just send it.
        operatorList.addOp(OPS.paintJpegXObject, args);
        this.handler.send('obj',
          [objId, this.pageIndex, 'JpegStream',
           image.getIR(this.options.forceDataSchema)]);
        return;
      }

      // Creates native image decoder only if a JPEG image or mask is present.
      var nativeImageDecoder = null;
      if (image instanceof JpegStream || mask instanceof JpegStream ||
          softMask instanceof JpegStream) {
        nativeImageDecoder = new NativeImageDecoder(self.xref, resources,
          self.handler, self.options.forceDataSchema);
      }

      PDFImage.buildImage(self.handler, self.xref, resources, image, inline,
                          nativeImageDecoder).
        then(function(imageObj) {
          var imgData = imageObj.createImageData(/* forceRGBA = */ false);
          self.handler.send('obj', [objId, self.pageIndex, 'Image', imgData],
            [imgData.data.buffer]);
        }).then(undefined, function (reason) {
          warn('Unable to decode image: ' + reason);
          self.handler.send('obj', [objId, self.pageIndex, 'Image', null]);
        });

      operatorList.addOp(OPS.paintImageXObject, args);
      if (cacheKey) {
        imageCache[cacheKey] = {
          fn: OPS.paintImageXObject,
          args: args
        };
      }
    },

    handleSMask: function PartialEvaluator_handleSmask(smask, resources,
                                                       operatorList, task,
                                                       stateManager) {
      var smaskContent = smask.get('G');
      var smaskOptions = {
        subtype: smask.get('S').name,
        backdrop: smask.get('BC')
      };

      // The SMask might have a alpha/luminosity value transfer function --
      // we will build a map of integer values in range 0..255 to be fast.
      var transferObj = smask.get('TR');
      if (isPDFFunction(transferObj)) {
        var transferFn = PDFFunction.parse(this.xref, transferObj);
        var transferMap = new Uint8Array(256);
        var tmp = new Float32Array(1);
        for (var i = 0; i < 256; i++) {
          tmp[0] = i / 255;
          transferFn(tmp, 0, tmp, 0);
          transferMap[i] = (tmp[0] * 255) | 0;
        }
        smaskOptions.transferMap = transferMap;
      }

      return this.buildFormXObject(resources, smaskContent, smaskOptions,
                            operatorList, task, stateManager.state.clone());
    },

    handleTilingType:
        function PartialEvaluator_handleTilingType(fn, args, resources,
                                                   pattern, patternDict,
                                                   operatorList, task) {
      // Create an IR of the pattern code.
      var tilingOpList = new OperatorList();
      // Merge the available resources, to prevent issues when the patternDict
      // is missing some /Resources entries (fixes issue6541.pdf).
      var resourcesArray = [patternDict.get('Resources'), resources];
      var patternResources = Dict.merge(this.xref, resourcesArray);

      return this.getOperatorList(pattern, task, patternResources,
                                  tilingOpList).then(function () {
          // Add the dependencies to the parent operator list so they are
          // resolved before sub operator list is executed synchronously.
          operatorList.addDependencies(tilingOpList.dependencies);
          operatorList.addOp(fn, getTilingPatternIR({
            fnArray: tilingOpList.fnArray,
            argsArray: tilingOpList.argsArray
          }, patternDict, args));
        });
    },

    handleSetFont:
        function PartialEvaluator_handleSetFont(resources, fontArgs, fontRef,
                                                operatorList, task, state) {
      // TODO(mack): Not needed?
      var fontName;
      if (fontArgs) {
        fontArgs = fontArgs.slice();
        fontName = fontArgs[0].name;
      }

      var self = this;
      return this.loadFont(fontName, fontRef, this.xref, resources).then(
          function (translated) {
        if (!translated.font.isType3Font) {
          return translated;
        }
        return translated.loadType3Data(self, resources, operatorList, task).
          then(function () {
          return translated;
        }, function (reason) {
          // Error in the font data -- sending unsupported feature notification.
          self.handler.send('UnsupportedFeature',
                            {featureId: UNSUPPORTED_FEATURES.font});
          return new TranslatedFont('g_font_error',
            new ErrorFont('Type3 font load error: ' + reason), translated.font);
        });
      }).then(function (translated) {
        state.font = translated.font;
        translated.send(self.handler);
        return translated.loadedName;
      });
    },

    handleText: function PartialEvaluator_handleText(chars, state) {
      var font = state.font;
      var glyphs = font.charsToGlyphs(chars);
      var isAddToPathSet = !!(state.textRenderingMode &
                              TextRenderingMode.ADD_TO_PATH_FLAG);
      if (font.data && (isAddToPathSet || this.options.disableFontFace)) {
        var buildPath = function (fontChar) {
          if (!font.renderer.hasBuiltPath(fontChar)) {
            var path = font.renderer.getPathJs(fontChar);
            this.handler.send('commonobj', [
              font.loadedName + '_path_' + fontChar,
              'FontPath',
              path
            ]);
          }
        }.bind(this);

        for (var i = 0, ii = glyphs.length; i < ii; i++) {
          var glyph = glyphs[i];
          buildPath(glyph.fontChar);

          // If the glyph has an accent we need to build a path for its
          // fontChar too, otherwise CanvasGraphics_paintChar will fail.
          var accent = glyph.accent;
          if (accent && accent.fontChar) {
            buildPath(accent.fontChar);
          }
        }
      }

      return glyphs;
    },

    setGState: function PartialEvaluator_setGState(resources, gState,
                                                   operatorList, task,
                                                   xref, stateManager) {
      // This array holds the converted/processed state data.
      var gStateObj = [];
      var gStateKeys = gState.getKeys();
      var self = this;
      var promise = Promise.resolve();
      for (var i = 0, ii = gStateKeys.length; i < ii; i++) {
        var key = gStateKeys[i];
        var value = gState.get(key);
        switch (key) {
          case 'Type':
            break;
          case 'LW':
          case 'LC':
          case 'LJ':
          case 'ML':
          case 'D':
          case 'RI':
          case 'FL':
          case 'CA':
          case 'ca':
            gStateObj.push([key, value]);
            break;
          case 'Font':
            promise = promise.then(function () {
              return self.handleSetFont(resources, null, value[0], operatorList,
                                        task, stateManager.state).
                then(function (loadedName) {
                  operatorList.addDependency(loadedName);
                  gStateObj.push([key, [loadedName, value[1]]]);
                });
            });
            break;
          case 'BM':
            gStateObj.push([key, value]);
            break;
          case 'SMask':
            if (isName(value) && value.name === 'None') {
              gStateObj.push([key, false]);
              break;
            }
            if (isDict(value)) {
              promise = promise.then(function (dict) {
                return self.handleSMask(dict, resources, operatorList,
                                        task, stateManager);
              }.bind(this, value));
              gStateObj.push([key, true]);
            } else {
              warn('Unsupported SMask type');
            }

            break;
          // Only generate info log messages for the following since
          // they are unlikely to have a big impact on the rendering.
          case 'OP':
          case 'op':
          case 'OPM':
          case 'BG':
          case 'BG2':
          case 'UCR':
          case 'UCR2':
          case 'TR':
          case 'TR2':
          case 'HT':
          case 'SM':
          case 'SA':
          case 'AIS':
          case 'TK':
            // TODO implement these operators.
            info('graphic state operator ' + key);
            break;
          default:
            info('Unknown graphic state operator ' + key);
            break;
        }
      }
      return promise.then(function () {
        if (gStateObj.length > 0) {
          operatorList.addOp(OPS.setGState, [gStateObj]);
        }
      });
    },

    loadFont: function PartialEvaluator_loadFont(fontName, font, xref,
                                                 resources) {

      function errorFont() {
        return Promise.resolve(new TranslatedFont('g_font_error',
          new ErrorFont('Font ' + fontName + ' is not available'), font));
      }
      var fontRef;
      if (font) { // Loading by ref.
        assert(isRef(font));
        fontRef = font;
      } else { // Loading by name.
        var fontRes = resources.get('Font');
        if (fontRes) {
          fontRef = fontRes.getRaw(fontName);
        } else {
          warn('fontRes not available');
          return errorFont();
        }
      }
      if (!fontRef) {
        warn('fontRef not available');
        return errorFont();
      }

      if (this.fontCache.has(fontRef)) {
        return this.fontCache.get(fontRef);
      }

      font = xref.fetchIfRef(fontRef);
      if (!isDict(font)) {
        return errorFont();
      }

      // We are holding font.translated references just for fontRef that are not
      // dictionaries (Dict). See explanation below.
      if (font.translated) {
        return font.translated;
      }

      var fontCapability = createPromiseCapability();

      var preEvaluatedFont = this.preEvaluateFont(font, xref);
      var descriptor = preEvaluatedFont.descriptor;
      var fontID = fontRef.num + '_' + fontRef.gen;
      if (isDict(descriptor)) {
        if (!descriptor.fontAliases) {
          descriptor.fontAliases = Object.create(null);
        }

        var fontAliases = descriptor.fontAliases;
        var hash = preEvaluatedFont.hash;
        if (fontAliases[hash]) {
          var aliasFontRef = fontAliases[hash].aliasRef;
          if (aliasFontRef && this.fontCache.has(aliasFontRef)) {
            this.fontCache.putAlias(fontRef, aliasFontRef);
            return this.fontCache.get(fontRef);
          }
        }

        if (!fontAliases[hash]) {
          fontAliases[hash] = {
            fontID: Font.getFontID()
          };
        }

        fontAliases[hash].aliasRef = fontRef;
        fontID = fontAliases[hash].fontID;
      }

      // Workaround for bad PDF generators that don't reference fonts
      // properly, i.e. by not using an object identifier.
      // Check if the fontRef is a Dict (as opposed to a standard object),
      // in which case we don't cache the font and instead reference it by
      // fontName in font.loadedName below.
      var fontRefIsDict = isDict(fontRef);
      if (!fontRefIsDict) {
        this.fontCache.put(fontRef, fontCapability.promise);
      }

      // Keep track of each font we translated so the caller can
      // load them asynchronously before calling display on a page.
      font.loadedName = 'g_' + this.pdfManager.docId + '_f' + (fontRefIsDict ?
        fontName.replace(/\W/g, '') : fontID);

      font.translated = fontCapability.promise;

      // TODO move promises into translate font
      var translatedPromise;
      try {
        translatedPromise = this.translateFont(preEvaluatedFont, xref);
      } catch (e) {
        translatedPromise = Promise.reject(e);
      }

      var self = this;
      translatedPromise.then(function (translatedFont) {
        if (translatedFont.fontType !== undefined) {
          var xrefFontStats = xref.stats.fontTypes;
          xrefFontStats[translatedFont.fontType] = true;
        }

        fontCapability.resolve(new TranslatedFont(font.loadedName,
          translatedFont, font));
      }, function (reason) {
        // TODO fontCapability.reject?
        // Error in the font data -- sending unsupported feature notification.
        self.handler.send('UnsupportedFeature',
                          {featureId: UNSUPPORTED_FEATURES.font});

        try {
          // error, but it's still nice to have font type reported
          var descriptor = preEvaluatedFont.descriptor;
          var fontFile3 = descriptor && descriptor.get('FontFile3');
          var subtype = fontFile3 && fontFile3.get('Subtype');
          var fontType = getFontType(preEvaluatedFont.type,
                                     subtype && subtype.name);
          var xrefFontStats = xref.stats.fontTypes;
          xrefFontStats[fontType] = true;
        } catch (ex) { }

        fontCapability.resolve(new TranslatedFont(font.loadedName,
          new ErrorFont(reason instanceof Error ? reason.message : reason),
          font));
      });
      return fontCapability.promise;
    },

    buildPath: function PartialEvaluator_buildPath(operatorList, fn, args) {
      var lastIndex = operatorList.length - 1;
      if (!args) {
        args = [];
      }
      if (lastIndex < 0 ||
          operatorList.fnArray[lastIndex] !== OPS.constructPath) {
        operatorList.addOp(OPS.constructPath, [[fn], args]);
      } else {
        var opArgs = operatorList.argsArray[lastIndex];
        opArgs[0].push(fn);
        Array.prototype.push.apply(opArgs[1], args);
      }
    },

    handleColorN: function PartialEvaluator_handleColorN(operatorList, fn, args,
          cs, patterns, resources, task, xref) {
      // compile tiling patterns
      var patternName = args[args.length - 1];
      // SCN/scn applies patterns along with normal colors
      var pattern;
      if (isName(patternName) &&
          (pattern = patterns.get(patternName.name))) {
        var dict = (isStream(pattern) ? pattern.dict : pattern);
        var typeNum = dict.get('PatternType');

        if (typeNum === TILING_PATTERN) {
          var color = cs.base ? cs.base.getRgb(args, 0) : null;
          return this.handleTilingType(fn, color, resources, pattern,
                                       dict, operatorList, task);
        } else if (typeNum === SHADING_PATTERN) {
          var shading = dict.get('Shading');
          var matrix = dict.get('Matrix');
          pattern = Pattern.parseShading(shading, matrix, xref, resources,
                                         this.handler);
          operatorList.addOp(fn, pattern.getIR());
          return Promise.resolve();
        } else {
          return Promise.reject('Unknown PatternType: ' + typeNum);
        }
      }
      // TODO shall we fail here?
      operatorList.addOp(fn, args);
      return Promise.resolve();
    },

    getOperatorList: function PartialEvaluator_getOperatorList(stream,
                                                               task,
                                                               resources,
                                                               operatorList,
                                                               initialState) {

      var self = this;
      var xref = this.xref;
      var imageCache = Object.create(null);

      assert(operatorList);

      resources = (resources || Dict.empty);
      var xobjs = (resources.get('XObject') || Dict.empty);
      var patterns = (resources.get('Pattern') || Dict.empty);
      var stateManager = new StateManager(initialState || new EvalState());
      var preprocessor = new EvaluatorPreprocessor(stream, xref, stateManager);
      var timeSlotManager = new TimeSlotManager();

      return new Promise(function promiseBody(resolve, reject) {
        var next = function (promise) {
          promise.then(function () {
            try {
              promiseBody(resolve, reject);
            } catch (ex) {
              reject(ex);
            }
          }, reject);
        };
        task.ensureNotTerminated();
        timeSlotManager.reset();
        var stop, operation = {}, i, ii, cs;
        while (!(stop = timeSlotManager.check())) {
          // The arguments parsed by read() are used beyond this loop, so we
          // cannot reuse the same array on each iteration. Therefore we pass
          // in |null| as the initial value (see the comment on
          // EvaluatorPreprocessor_read() for why).
          operation.args = null;
          if (!(preprocessor.read(operation))) {
            break;
          }
          var args = operation.args;
          var fn = operation.fn;

          switch (fn | 0) {
            case OPS.paintXObject:
              if (args[0].code) {
                break;
              }
              // eagerly compile XForm objects
              var name = args[0].name;
              if (!name) {
                warn('XObject must be referred to by name.');
                continue;
              }
              if (imageCache[name] !== undefined) {
                operatorList.addOp(imageCache[name].fn, imageCache[name].args);
                args = null;
                continue;
              }

              var xobj = xobjs.get(name);
              if (xobj) {
                assert(isStream(xobj), 'XObject should be a stream');

                var type = xobj.dict.get('Subtype');
                assert(isName(type),
                  'XObject should have a Name subtype');

                if (type.name === 'Form') {
                  stateManager.save();
                  next(self.buildFormXObject(resources, xobj, null,
                                             operatorList, task,
                                             stateManager.state.clone()).
                    then(function () {
                      stateManager.restore();
                    }));
                  return;
                } else if (type.name === 'Image') {
                  self.buildPaintImageXObject(resources, xobj, false,
                    operatorList, name, imageCache);
                  args = null;
                  continue;
                } else if (type.name === 'PS') {
                  // PostScript XObjects are unused when viewing documents.
                  // See section 4.7.1 of Adobe's PDF reference.
                  info('Ignored XObject subtype PS');
                  continue;
                } else {
                  error('Unhandled XObject subtype ' + type.name);
                }
              }
              break;
            case OPS.setFont:
              var fontSize = args[1];
              // eagerly collect all fonts
              next(self.handleSetFont(resources, args, null, operatorList,
                                      task, stateManager.state).
                then(function (loadedName) {
                  operatorList.addDependency(loadedName);
                  operatorList.addOp(OPS.setFont, [loadedName, fontSize]);
                }));
              return;
            case OPS.endInlineImage:
              var cacheKey = args[0].cacheKey;
              if (cacheKey) {
                var cacheEntry = imageCache[cacheKey];
                if (cacheEntry !== undefined) {
                  operatorList.addOp(cacheEntry.fn, cacheEntry.args);
                  args = null;
                  continue;
                }
              }
              self.buildPaintImageXObject(resources, args[0], true,
                operatorList, cacheKey, imageCache);
              args = null;
              continue;
            case OPS.showText:
              args[0] = self.handleText(args[0], stateManager.state);
              break;
            case OPS.showSpacedText:
              var arr = args[0];
              var combinedGlyphs = [];
              var arrLength = arr.length;
              var state = stateManager.state;
              for (i = 0; i < arrLength; ++i) {
                var arrItem = arr[i];
                if (isString(arrItem)) {
                  Array.prototype.push.apply(combinedGlyphs,
                    self.handleText(arrItem, state));
                } else if (isNum(arrItem)) {
                  combinedGlyphs.push(arrItem);
                }
              }
              args[0] = combinedGlyphs;
              fn = OPS.showText;
              break;
            case OPS.nextLineShowText:
              operatorList.addOp(OPS.nextLine);
              args[0] = self.handleText(args[0], stateManager.state);
              fn = OPS.showText;
              break;
            case OPS.nextLineSetSpacingShowText:
              operatorList.addOp(OPS.nextLine);
              operatorList.addOp(OPS.setWordSpacing, [args.shift()]);
              operatorList.addOp(OPS.setCharSpacing, [args.shift()]);
              args[0] = self.handleText(args[0], stateManager.state);
              fn = OPS.showText;
              break;
            case OPS.setTextRenderingMode:
              stateManager.state.textRenderingMode = args[0];
              break;

            case OPS.setFillColorSpace:
              stateManager.state.fillColorSpace =
                ColorSpace.parse(args[0], xref, resources);
              continue;
            case OPS.setStrokeColorSpace:
              stateManager.state.strokeColorSpace =
                ColorSpace.parse(args[0], xref, resources);
              continue;
            case OPS.setFillColor:
              cs = stateManager.state.fillColorSpace;
              args = cs.getRgb(args, 0);
              fn = OPS.setFillRGBColor;
              break;
            case OPS.setStrokeColor:
              cs = stateManager.state.strokeColorSpace;
              args = cs.getRgb(args, 0);
              fn = OPS.setStrokeRGBColor;
              break;
            case OPS.setFillGray:
              stateManager.state.fillColorSpace = ColorSpace.singletons.gray;
              args = ColorSpace.singletons.gray.getRgb(args, 0);
              fn = OPS.setFillRGBColor;
              break;
            case OPS.setStrokeGray:
              stateManager.state.strokeColorSpace = ColorSpace.singletons.gray;
              args = ColorSpace.singletons.gray.getRgb(args, 0);
              fn = OPS.setStrokeRGBColor;
              break;
            case OPS.setFillCMYKColor:
              stateManager.state.fillColorSpace = ColorSpace.singletons.cmyk;
              args = ColorSpace.singletons.cmyk.getRgb(args, 0);
              fn = OPS.setFillRGBColor;
              break;
            case OPS.setStrokeCMYKColor:
              stateManager.state.strokeColorSpace = ColorSpace.singletons.cmyk;
              args = ColorSpace.singletons.cmyk.getRgb(args, 0);
              fn = OPS.setStrokeRGBColor;
              break;
            case OPS.setFillRGBColor:
              stateManager.state.fillColorSpace = ColorSpace.singletons.rgb;
              args = ColorSpace.singletons.rgb.getRgb(args, 0);
              break;
            case OPS.setStrokeRGBColor:
              stateManager.state.strokeColorSpace = ColorSpace.singletons.rgb;
              args = ColorSpace.singletons.rgb.getRgb(args, 0);
              break;
            case OPS.setFillColorN:
              cs = stateManager.state.fillColorSpace;
              if (cs.name === 'Pattern') {
                next(self.handleColorN(operatorList, OPS.setFillColorN, args,
                     cs, patterns, resources, task, xref));
                return;
              }
              args = cs.getRgb(args, 0);
              fn = OPS.setFillRGBColor;
              break;
            case OPS.setStrokeColorN:
              cs = stateManager.state.strokeColorSpace;
              if (cs.name === 'Pattern') {
                next(self.handleColorN(operatorList, OPS.setStrokeColorN, args,
                     cs, patterns, resources, task, xref));
                return;
              }
              args = cs.getRgb(args, 0);
              fn = OPS.setStrokeRGBColor;
              break;

            case OPS.shadingFill:
              var shadingRes = resources.get('Shading');
              if (!shadingRes) {
                error('No shading resource found');
              }

              var shading = shadingRes.get(args[0].name);
              if (!shading) {
                error('No shading object found');
              }

              var shadingFill = Pattern.parseShading(shading, null, xref,
                resources, self.handler);
              var patternIR = shadingFill.getIR();
              args = [patternIR];
              fn = OPS.shadingFill;
              break;
            case OPS.setGState:
              var dictName = args[0];
              var extGState = resources.get('ExtGState');

              if (!isDict(extGState) || !extGState.has(dictName.name)) {
                break;
              }

              var gState = extGState.get(dictName.name);
              next(self.setGState(resources, gState, operatorList, task, xref,
                   stateManager));
              return;
            case OPS.moveTo:
            case OPS.lineTo:
            case OPS.curveTo:
            case OPS.curveTo2:
            case OPS.curveTo3:
            case OPS.closePath:
              self.buildPath(operatorList, fn, args);
              continue;
            case OPS.rectangle:
              self.buildPath(operatorList, fn, args);
              continue;
            case OPS.markPoint:
            case OPS.markPointProps:
            case OPS.beginMarkedContent:
            case OPS.beginMarkedContentProps:
            case OPS.endMarkedContent:
            case OPS.beginCompat:
            case OPS.endCompat:
              // Ignore operators where the corresponding handlers are known to
              // be no-op in CanvasGraphics (display/canvas.js). This prevents
              // serialization errors and is also a bit more efficient.
              // We could also try to serialize all objects in a general way,
              // e.g. as done in https://github.com/mozilla/pdf.js/pull/6266,
              // but doing so is meaningless without knowing the semantics.
              continue;
            default:
              // Note: Ignore the operator if it has `Dict` arguments, since
              // those are non-serializable, otherwise postMessage will throw
              // "An object could not be cloned.".
              if (args !== null) {
                for (i = 0, ii = args.length; i < ii; i++) {
                  if (args[i] instanceof Dict) {
                    break;
                  }
                }
                if (i < ii) {
                  warn('getOperatorList - ignoring operator: ' + fn);
                  continue;
                }
              }
          }
          operatorList.addOp(fn, args);
        }
        if (stop) {
          next(deferred);
          return;
        }
        // Some PDFs don't close all restores inside object/form.
        // Closing those for them.
        for (i = 0, ii = preprocessor.savedStatesDepth; i < ii; i++) {
          operatorList.addOp(OPS.restore, []);
        }
        resolve();
      });
    },

    getTextContent:
        function PartialEvaluator_getTextContent(stream, task, resources,
                                                 stateManager,
                                                 normalizeWhitespace) {

      stateManager = (stateManager || new StateManager(new TextState()));

      var WhitespaceRegexp = /\s/g;

      var textContent = {
        items: [],
        styles: Object.create(null)
      };
      var textContentItem = {
        initialized: false,
        str: [],
        width: 0,
        height: 0,
        vertical: false,
        lastAdvanceWidth: 0,
        lastAdvanceHeight: 0,
        textAdvanceScale: 0,
        spaceWidth: 0,
        fakeSpaceMin: Infinity,
        fakeMultiSpaceMin: Infinity,
        fakeMultiSpaceMax: -0,
        textRunBreakAllowed: false,
        transform: null,
        fontName: null
      };
      var SPACE_FACTOR = 0.3;
      var MULTI_SPACE_FACTOR = 1.5;
      var MULTI_SPACE_FACTOR_MAX = 4;

      var self = this;
      var xref = this.xref;

      resources = (xref.fetchIfRef(resources) || Dict.empty);

      // The xobj is parsed iff it's needed, e.g. if there is a `DO` cmd.
      var xobjs = null;
      var xobjsCache = Object.create(null);

      var preprocessor = new EvaluatorPreprocessor(stream, xref, stateManager);

      var textState;

      function ensureTextContentItem() {
        if (textContentItem.initialized) {
          return textContentItem;
        }
        var font = textState.font;
        if (!(font.loadedName in textContent.styles)) {
          textContent.styles[font.loadedName] = {
            fontFamily: font.fallbackName,
            ascent: font.ascent,
            descent: font.descent,
            vertical: font.vertical
          };
        }
        textContentItem.fontName = font.loadedName;

        // 9.4.4 Text Space Details
        var tsm = [textState.fontSize * textState.textHScale, 0,
                   0, textState.fontSize,
                   0, textState.textRise];

        if (font.isType3Font &&
            textState.fontMatrix !== FONT_IDENTITY_MATRIX &&
            textState.fontSize === 1) {
          var glyphHeight = font.bbox[3] - font.bbox[1];
          if (glyphHeight > 0) {
            glyphHeight = glyphHeight * textState.fontMatrix[3];
            tsm[3] *= glyphHeight;
          }
        }

        var trm = Util.transform(textState.ctm,
                                 Util.transform(textState.textMatrix, tsm));
        textContentItem.transform = trm;
        if (!font.vertical) {
          textContentItem.width = 0;
          textContentItem.height = Math.sqrt(trm[2] * trm[2] + trm[3] * trm[3]);
          textContentItem.vertical = false;
        } else {
          textContentItem.width = Math.sqrt(trm[0] * trm[0] + trm[1] * trm[1]);
          textContentItem.height = 0;
          textContentItem.vertical = true;
        }

        var a = textState.textLineMatrix[0];
        var b = textState.textLineMatrix[1];
        var scaleLineX = Math.sqrt(a * a + b * b);
        a = textState.ctm[0];
        b = textState.ctm[1];
        var scaleCtmX = Math.sqrt(a * a + b * b);
        textContentItem.textAdvanceScale = scaleCtmX * scaleLineX;
        textContentItem.lastAdvanceWidth = 0;
        textContentItem.lastAdvanceHeight = 0;

        var spaceWidth = font.spaceWidth / 1000 * textState.fontSize;
        if (spaceWidth) {
          textContentItem.spaceWidth = spaceWidth;
          textContentItem.fakeSpaceMin = spaceWidth * SPACE_FACTOR;
          textContentItem.fakeMultiSpaceMin = spaceWidth * MULTI_SPACE_FACTOR;
          textContentItem.fakeMultiSpaceMax =
            spaceWidth * MULTI_SPACE_FACTOR_MAX;
          // It's okay for monospace fonts to fake as much space as needed.
          textContentItem.textRunBreakAllowed = !font.isMonospace;
        } else {
          textContentItem.spaceWidth = 0;
          textContentItem.fakeSpaceMin = Infinity;
          textContentItem.fakeMultiSpaceMin = Infinity;
          textContentItem.fakeMultiSpaceMax = 0;
          textContentItem.textRunBreakAllowed = false;
        }


        textContentItem.initialized = true;
        return textContentItem;
      }

      function replaceWhitespace(str) {
        // Replaces all whitespaces with standard spaces (0x20), to avoid
        // alignment issues between the textLayer and the canvas if the text
        // contains e.g. tabs (fixes issue6612.pdf).
        var i = 0, ii = str.length, code;
        while (i < ii && (code = str.charCodeAt(i)) >= 0x20 && code <= 0x7F) {
          i++;
        }
        return (i < ii ? str.replace(WhitespaceRegexp, ' ') : str);
      }

      function runBidiTransform(textChunk) {
        var str = textChunk.str.join('');
        var bidiResult = bidi(str, -1, textChunk.vertical);
        return {
          str: (normalizeWhitespace ? replaceWhitespace(bidiResult.str) :
                                      bidiResult.str),
          dir: bidiResult.dir,
          width: textChunk.width,
          height: textChunk.height,
          transform: textChunk.transform,
          fontName: textChunk.fontName
        };
      }

      function handleSetFont(fontName, fontRef) {
        return self.loadFont(fontName, fontRef, xref, resources).
          then(function (translated) {
            textState.font = translated.font;
            textState.fontMatrix = translated.font.fontMatrix ||
              FONT_IDENTITY_MATRIX;
          });
      }

      function buildTextContentItem(chars) {
        var font = textState.font;
        var textChunk = ensureTextContentItem();
        var width = 0;
        var height = 0;
        var glyphs = font.charsToGlyphs(chars);
        var defaultVMetrics = font.defaultVMetrics;
        for (var i = 0; i < glyphs.length; i++) {
          var glyph = glyphs[i];
          var vMetricX = null;
          var vMetricY = null;
          var glyphWidth = null;
          if (font.vertical) {
            if (glyph.vmetric) {
              glyphWidth = glyph.vmetric[0];
              vMetricX = glyph.vmetric[1];
              vMetricY = glyph.vmetric[2];
            } else {
              glyphWidth = glyph.width;
              vMetricX = glyph.width * 0.5;
              vMetricY = defaultVMetrics[2];
            }
          } else {
            glyphWidth = glyph.width;
          }

          var glyphUnicode = glyph.unicode;
          var NormalizedUnicodes = getNormalizedUnicodes();
          if (NormalizedUnicodes[glyphUnicode] !== undefined) {
            glyphUnicode = NormalizedUnicodes[glyphUnicode];
          }
          glyphUnicode = reverseIfRtl(glyphUnicode);

          // The following will calculate the x and y of the individual glyphs.
          // if (font.vertical) {
          //   tsm[4] -= vMetricX * Math.abs(textState.fontSize) *
          //             textState.fontMatrix[0];
          //   tsm[5] -= vMetricY * textState.fontSize *
          //             textState.fontMatrix[0];
          // }
          // var trm = Util.transform(textState.textMatrix, tsm);
          // var pt = Util.applyTransform([trm[4], trm[5]], textState.ctm);
          // var x = pt[0];
          // var y = pt[1];

          var charSpacing = textState.charSpacing;
          if (glyph.isSpace) {
            var wordSpacing = textState.wordSpacing;
            charSpacing += wordSpacing;
            if (wordSpacing > 0) {
              addFakeSpaces(wordSpacing, textChunk.str);
            }
          }

          var tx = 0;
          var ty = 0;
          if (!font.vertical) {
            var w0 = glyphWidth * textState.fontMatrix[0];
            tx = (w0 * textState.fontSize + charSpacing) *
                 textState.textHScale;
            width += tx;
          } else {
            var w1 = glyphWidth * textState.fontMatrix[0];
            ty = w1 * textState.fontSize + charSpacing;
            height += ty;
          }
          textState.translateTextMatrix(tx, ty);

          textChunk.str.push(glyphUnicode);
        }

        if (!font.vertical) {
          textChunk.lastAdvanceWidth = width;
          textChunk.width += width * textChunk.textAdvanceScale;
        } else {
          textChunk.lastAdvanceHeight = height;
          textChunk.height += Math.abs(height * textChunk.textAdvanceScale);
        }

        return textChunk;
      }

      function addFakeSpaces(width, strBuf) {
        if (width < textContentItem.fakeSpaceMin) {
          return;
        }
        if (width < textContentItem.fakeMultiSpaceMin) {
          strBuf.push(' ');
          return;
        }
        var fakeSpaces = Math.round(width / textContentItem.spaceWidth);
        while (fakeSpaces-- > 0) {
          strBuf.push(' ');
        }
      }

      function flushTextContentItem() {
        if (!textContentItem.initialized) {
          return;
        }
        textContent.items.push(runBidiTransform(textContentItem));

        textContentItem.initialized = false;
        textContentItem.str.length = 0;
      }

      var timeSlotManager = new TimeSlotManager();

      return new Promise(function promiseBody(resolve, reject) {
        var next = function (promise) {
          promise.then(function () {
            try {
              promiseBody(resolve, reject);
            } catch (ex) {
              reject(ex);
            }
          }, reject);
        };
        task.ensureNotTerminated();
        timeSlotManager.reset();
        var stop, operation = {}, args = [];
        while (!(stop = timeSlotManager.check())) {
          // The arguments parsed by read() are not used beyond this loop, so
          // we can reuse the same array on every iteration, thus avoiding
          // unnecessary allocations.
          args.length = 0;
          operation.args = args;
          if (!(preprocessor.read(operation))) {
            break;
          }
          textState = stateManager.state;
          var fn = operation.fn;
          args = operation.args;
          var advance;

          switch (fn | 0) {
            case OPS.setFont:
              flushTextContentItem();
              textState.fontSize = args[1];
              next(handleSetFont(args[0].name));
              return;
            case OPS.setTextRise:
              flushTextContentItem();
              textState.textRise = args[0];
              break;
            case OPS.setHScale:
              flushTextContentItem();
              textState.textHScale = args[0] / 100;
              break;
            case OPS.setLeading:
              flushTextContentItem();
              textState.leading = args[0];
              break;
            case OPS.moveText:
              // Optimization to treat same line movement as advance
              var isSameTextLine = !textState.font ? false :
                ((textState.font.vertical ? args[0] : args[1]) === 0);
              advance = args[0] - args[1];
              if (isSameTextLine && textContentItem.initialized &&
                  advance > 0 &&
                  advance <= textContentItem.fakeMultiSpaceMax) {
                textState.translateTextLineMatrix(args[0], args[1]);
                textContentItem.width +=
                  (args[0] - textContentItem.lastAdvanceWidth);
                textContentItem.height +=
                  (args[1] - textContentItem.lastAdvanceHeight);
                var diff = (args[0] - textContentItem.lastAdvanceWidth) -
                           (args[1] - textContentItem.lastAdvanceHeight);
                addFakeSpaces(diff, textContentItem.str);
                break;
              }

              flushTextContentItem();
              textState.translateTextLineMatrix(args[0], args[1]);
              textState.textMatrix = textState.textLineMatrix.slice();
              break;
            case OPS.setLeadingMoveText:
              flushTextContentItem();
              textState.leading = -args[1];
              textState.translateTextLineMatrix(args[0], args[1]);
              textState.textMatrix = textState.textLineMatrix.slice();
              break;
            case OPS.nextLine:
              flushTextContentItem();
              textState.carriageReturn();
              break;
            case OPS.setTextMatrix:
              flushTextContentItem();
              textState.setTextMatrix(args[0], args[1], args[2], args[3],
                args[4], args[5]);
              textState.setTextLineMatrix(args[0], args[1], args[2], args[3],
                args[4], args[5]);
              break;
            case OPS.setCharSpacing:
              textState.charSpacing = args[0];
              break;
            case OPS.setWordSpacing:
              textState.wordSpacing = args[0];
              break;
            case OPS.beginText:
              flushTextContentItem();
              textState.textMatrix = IDENTITY_MATRIX.slice();
              textState.textLineMatrix = IDENTITY_MATRIX.slice();
              break;
            case OPS.showSpacedText:
              var items = args[0];
              var offset;
              for (var j = 0, jj = items.length; j < jj; j++) {
                if (typeof items[j] === 'string') {
                  buildTextContentItem(items[j]);
                } else {
                  ensureTextContentItem();

                  // PDF Specification 5.3.2 states:
                  // The number is expressed in thousandths of a unit of text
                  // space.
                  // This amount is subtracted from the current horizontal or
                  // vertical coordinate, depending on the writing mode.
                  // In the default coordinate system, a positive adjustment
                  // has the effect of moving the next glyph painted either to
                  // the left or down by the given amount.
                  advance = items[j] * textState.fontSize / 1000;
                  var breakTextRun = false;
                  if (textState.font.vertical) {
                    offset = advance *
                      (textState.textHScale * textState.textMatrix[2] +
                       textState.textMatrix[3]);
                    textState.translateTextMatrix(0, advance);
                    breakTextRun = textContentItem.textRunBreakAllowed &&
                                   advance > textContentItem.fakeMultiSpaceMax;
                    if (!breakTextRun) {
                      // Value needs to be added to height to paint down.
                      textContentItem.height += offset;
                    }
                  } else {
                    advance = -advance;
                    offset = advance * (
                      textState.textHScale * textState.textMatrix[0] +
                      textState.textMatrix[1]);
                    textState.translateTextMatrix(advance, 0);
                    breakTextRun = textContentItem.textRunBreakAllowed &&
                                   advance > textContentItem.fakeMultiSpaceMax;
                    if (!breakTextRun) {
                      // Value needs to be subtracted from width to paint left.
                      textContentItem.width += offset;
                    }
                  }
                  if (breakTextRun) {
                    flushTextContentItem();
                  } else if (advance > 0) {
                    addFakeSpaces(advance, textContentItem.str);
                  }
                }
              }
              break;
            case OPS.showText:
              buildTextContentItem(args[0]);
              break;
            case OPS.nextLineShowText:
              flushTextContentItem();
              textState.carriageReturn();
              buildTextContentItem(args[0]);
              break;
            case OPS.nextLineSetSpacingShowText:
              flushTextContentItem();
              textState.wordSpacing = args[0];
              textState.charSpacing = args[1];
              textState.carriageReturn();
              buildTextContentItem(args[2]);
              break;
            case OPS.paintXObject:
              flushTextContentItem();
              if (args[0].code) {
                break;
              }

              if (!xobjs) {
                xobjs = (resources.get('XObject') || Dict.empty);
              }

              var name = args[0].name;
              if (xobjsCache.key === name) {
                if (xobjsCache.texts) {
                  Util.appendToArray(textContent.items, xobjsCache.texts.items);
                  Util.extendObj(textContent.styles, xobjsCache.texts.styles);
                }
                break;
              }

              var xobj = xobjs.get(name);
              if (!xobj) {
                break;
              }
              assert(isStream(xobj), 'XObject should be a stream');

              var type = xobj.dict.get('Subtype');
              assert(isName(type),
                'XObject should have a Name subtype');

              if ('Form' !== type.name) {
                xobjsCache.key = name;
                xobjsCache.texts = null;
                break;
              }

              stateManager.save();
              var matrix = xobj.dict.get('Matrix');
              if (isArray(matrix) && matrix.length === 6) {
                stateManager.transform(matrix);
              }

              next(self.getTextContent(xobj, task,
                   xobj.dict.get('Resources') || resources, stateManager,
                   normalizeWhitespace).then(function (formTextContent) {
                  Util.appendToArray(textContent.items, formTextContent.items);
                  Util.extendObj(textContent.styles, formTextContent.styles);
                  stateManager.restore();

                  xobjsCache.key = name;
                  xobjsCache.texts = formTextContent;
                }));
              return;
            case OPS.setGState:
              flushTextContentItem();
              var dictName = args[0];
              var extGState = resources.get('ExtGState');

              if (!isDict(extGState) || !extGState.has(dictName.name)) {
                break;
              }

              var gsStateMap = extGState.get(dictName.name);
              var gsStateFont = null;
              for (var key in gsStateMap) {
                if (key === 'Font') {
                  assert(!gsStateFont);
                  gsStateFont = gsStateMap[key];
                }
              }
              if (gsStateFont) {
                textState.fontSize = gsStateFont[1];
                next(handleSetFont(gsStateFont[0]));
                return;
              }
              break;
          } // switch
        } // while
        if (stop) {
          next(deferred);
          return;
        }
        flushTextContentItem();
        resolve(textContent);
      });
    },

    extractDataStructures:
        function PartialEvaluator_extractDataStructures(dict, baseDict,
                                                        xref, properties) {
      // 9.10.2
      var toUnicode = (dict.get('ToUnicode') || baseDict.get('ToUnicode'));
      var toUnicodePromise = toUnicode ?
        this.readToUnicode(toUnicode) : Promise.resolve(undefined);

      if (properties.composite) {
        // CIDSystemInfo helps to match CID to glyphs
        var cidSystemInfo = dict.get('CIDSystemInfo');
        if (isDict(cidSystemInfo)) {
          properties.cidSystemInfo = {
            registry: cidSystemInfo.get('Registry'),
            ordering: cidSystemInfo.get('Ordering'),
            supplement: cidSystemInfo.get('Supplement')
          };
        }

        var cidToGidMap = dict.get('CIDToGIDMap');
        if (isStream(cidToGidMap)) {
          properties.cidToGidMap = this.readCidToGidMap(cidToGidMap);
        }
      }

      // Based on 9.6.6 of the spec the encoding can come from multiple places
      // and depends on the font type. The base encoding and differences are
      // read here, but the encoding that is actually used is chosen during
      // glyph mapping in the font.
      // TODO: Loading the built in encoding in the font would allow the
      // differences to be merged in here not require us to hold on to it.
      var differences = [];
      var baseEncodingName = null;
      var encoding;
      if (dict.has('Encoding')) {
        encoding = dict.get('Encoding');
        if (isDict(encoding)) {
          baseEncodingName = encoding.get('BaseEncoding');
          baseEncodingName = (isName(baseEncodingName) ?
                              baseEncodingName.name : null);
          // Load the differences between the base and original
          if (encoding.has('Differences')) {
            var diffEncoding = encoding.get('Differences');
            var index = 0;
            for (var j = 0, jj = diffEncoding.length; j < jj; j++) {
              var data = xref.fetchIfRef(diffEncoding[j]);
              if (isNum(data)) {
                index = data;
              } else if (isName(data)) {
                differences[index++] = data.name;
              } else {
                error('Invalid entry in \'Differences\' array: ' + data);
              }
            }
          }
        } else if (isName(encoding)) {
          baseEncodingName = encoding.name;
        } else {
          error('Encoding is not a Name nor a Dict');
        }
        // According to table 114 if the encoding is a named encoding it must be
        // one of these predefined encodings.
        if ((baseEncodingName !== 'MacRomanEncoding' &&
             baseEncodingName !== 'MacExpertEncoding' &&
             baseEncodingName !== 'WinAnsiEncoding')) {
          baseEncodingName = null;
        }
      }

      if (baseEncodingName) {
        properties.defaultEncoding = getEncoding(baseEncodingName).slice();
      } else {
        encoding = (properties.type === 'TrueType' ?
                    WinAnsiEncoding : StandardEncoding);
        // The Symbolic attribute can be misused for regular fonts
        // Heuristic: we have to check if the font is a standard one also
        if (!!(properties.flags & FontFlags.Symbolic)) {
          encoding = MacRomanEncoding;
          if (!properties.file) {
            if (/Symbol/i.test(properties.name)) {
              encoding = SymbolSetEncoding;
            } else if (/Dingbats/i.test(properties.name)) {
              encoding = ZapfDingbatsEncoding;
            }
          }
        }
        properties.defaultEncoding = encoding;
      }

      properties.differences = differences;
      properties.baseEncodingName = baseEncodingName;
      properties.dict = dict;
      return toUnicodePromise.then(function(toUnicode) {
        properties.toUnicode = toUnicode;
        return this.buildToUnicode(properties);
      }.bind(this)).then(function (toUnicode) {
        properties.toUnicode = toUnicode;
        return properties;
      });
    },

    /**
     * Builds a char code to unicode map based on section 9.10 of the spec.
     * @param {Object} properties Font properties object.
     * @return {Promise} A Promise that is resolved with a
     *   {ToUnicodeMap|IdentityToUnicodeMap} object.
     */
    buildToUnicode: function PartialEvaluator_buildToUnicode(properties) {
      // Section 9.10.2 Mapping Character Codes to Unicode Values
      if (properties.toUnicode && properties.toUnicode.length !== 0) {
        return Promise.resolve(properties.toUnicode);
      }
      // According to the spec if the font is a simple font we should only map
      // to unicode if the base encoding is MacRoman, MacExpert, or WinAnsi or
      // the differences array only contains adobe standard or symbol set names,
      // in pratice it seems better to always try to create a toUnicode
      // map based of the default encoding.
      var toUnicode, charcode;
      if (!properties.composite /* is simple font */) {
        toUnicode = [];
        var encoding = properties.defaultEncoding.slice();
        var baseEncodingName = properties.baseEncodingName;
        // Merge in the differences array.
        var differences = properties.differences;
        for (charcode in differences) {
          encoding[charcode] = differences[charcode];
        }
        var glyphsUnicodeMap = getGlyphsUnicode();
        for (charcode in encoding) {
          // a) Map the character code to a character name.
          var glyphName = encoding[charcode];
          // b) Look up the character name in the Adobe Glyph List (see the
          //    Bibliography) to obtain the corresponding Unicode value.
          if (glyphName === '') {
            continue;
          } else if (glyphsUnicodeMap[glyphName] === undefined) {
            // (undocumented) c) Few heuristics to recognize unknown glyphs
            // NOTE: Adobe Reader does not do this step, but OSX Preview does
            var code = 0;
            switch (glyphName[0]) {
              case 'G': // Gxx glyph
                if (glyphName.length === 3) {
                  code = parseInt(glyphName.substr(1), 16);
                }
                break;
              case 'g': // g00xx glyph
                if (glyphName.length === 5) {
                  code = parseInt(glyphName.substr(1), 16);
                }
                break;
              case 'C': // Cddd glyph
              case 'c': // cddd glyph
                if (glyphName.length >= 3) {
                  code = +glyphName.substr(1);
                }
                break;
              default:
                // 'uniXXXX'/'uXXXX{XX}' glyphs
                var unicode = getUnicodeForGlyph(glyphName, glyphsUnicodeMap);
                if (unicode !== -1) {
                  code = unicode;
                }
            }
            if (code) {
              // If |baseEncodingName| is one the predefined encodings,
              // and |code| equals |charcode|, using the glyph defined in the
              // baseEncoding seems to yield a better |toUnicode| mapping
              // (fixes issue 5070).
              if (baseEncodingName && code === +charcode) {
                var baseEncoding = getEncoding(baseEncodingName);
                if (baseEncoding && (glyphName = baseEncoding[charcode])) {
                  toUnicode[charcode] =
                    String.fromCharCode(glyphsUnicodeMap[glyphName]);
                  continue;
                }
              }
              toUnicode[charcode] = String.fromCharCode(code);
            }
            continue;
          }
          toUnicode[charcode] =
            String.fromCharCode(glyphsUnicodeMap[glyphName]);
        }
        return Promise.resolve(new ToUnicodeMap(toUnicode));
      }
      // If the font is a composite font that uses one of the predefined CMaps
      // listed in Table 118 (except Identity–H and Identity–V) or whose
      // descendant CIDFont uses the Adobe-GB1, Adobe-CNS1, Adobe-Japan1, or
      // Adobe-Korea1 character collection:
      if (properties.composite && (
           (properties.cMap.builtInCMap &&
            !(properties.cMap instanceof IdentityCMap)) ||
           (properties.cidSystemInfo.registry === 'Adobe' &&
             (properties.cidSystemInfo.ordering === 'GB1' ||
              properties.cidSystemInfo.ordering === 'CNS1' ||
              properties.cidSystemInfo.ordering === 'Japan1' ||
              properties.cidSystemInfo.ordering === 'Korea1')))) {
        // Then:
        // a) Map the character code to a character identifier (CID) according
        // to the font’s CMap.
        // b) Obtain the registry and ordering of the character collection used
        // by the font’s CMap (for example, Adobe and Japan1) from its
        // CIDSystemInfo dictionary.
        var registry = properties.cidSystemInfo.registry;
        var ordering = properties.cidSystemInfo.ordering;
        // c) Construct a second CMap name by concatenating the registry and
        // ordering obtained in step (b) in the format registry–ordering–UCS2
        // (for example, Adobe–Japan1–UCS2).
        var ucs2CMapName = Name.get(registry + '-' + ordering + '-UCS2');
        // d) Obtain the CMap with the name constructed in step (c) (available
        // from the ASN Web site; see the Bibliography).
        return CMapFactory.create(ucs2CMapName, this.options.cMapOptions,
                                  null).then(
            function (ucs2CMap) {
          var cMap = properties.cMap;
          toUnicode = [];
          cMap.forEach(function(charcode, cid) {
            assert(cid <= 0xffff, 'Max size of CID is 65,535');
            // e) Map the CID obtained in step (a) according to the CMap
            // obtained in step (d), producing a Unicode value.
            var ucs2 = ucs2CMap.lookup(cid);
            if (ucs2) {
              toUnicode[charcode] =
                String.fromCharCode((ucs2.charCodeAt(0) << 8) +
                                    ucs2.charCodeAt(1));
            }
          });
          return new ToUnicodeMap(toUnicode);
        });
      }

      // The viewer's choice, just use an identity map.
      return Promise.resolve(new IdentityToUnicodeMap(properties.firstChar,
                                                      properties.lastChar));
    },

    readToUnicode: function PartialEvaluator_readToUnicode(toUnicode) {
      var cmapObj = toUnicode;
      if (isName(cmapObj)) {
        return CMapFactory.create(cmapObj, this.options.cMapOptions, null).then(
            function (cmap) {
          if (cmap instanceof IdentityCMap) {
            return new IdentityToUnicodeMap(0, 0xFFFF);
          }
          return new ToUnicodeMap(cmap.getMap());
        });
      } else if (isStream(cmapObj)) {
        return CMapFactory.create(cmapObj, this.options.cMapOptions, null).then(
            function (cmap) {
          if (cmap instanceof IdentityCMap) {
            return new IdentityToUnicodeMap(0, 0xFFFF);
          }
          var map = new Array(cmap.length);
          // Convert UTF-16BE
          // NOTE: cmap can be a sparse array, so use forEach instead of for(;;)
          // to iterate over all keys.
          cmap.forEach(function(charCode, token) {
            var str = [];
            for (var k = 0; k < token.length; k += 2) {
              var w1 = (token.charCodeAt(k) << 8) | token.charCodeAt(k + 1);
              if ((w1 & 0xF800) !== 0xD800) { // w1 < 0xD800 || w1 > 0xDFFF
                str.push(w1);
                continue;
              }
              k += 2;
              var w2 = (token.charCodeAt(k) << 8) | token.charCodeAt(k + 1);
              str.push(((w1 & 0x3ff) << 10) + (w2 & 0x3ff) + 0x10000);
            }
            map[charCode] = String.fromCharCode.apply(String, str);
          });
          return new ToUnicodeMap(map);
        });
      }
      return Promise.resolve(null);
    },

    readCidToGidMap: function PartialEvaluator_readCidToGidMap(cidToGidStream) {
      // Extract the encoding from the CIDToGIDMap
      var glyphsData = cidToGidStream.getBytes();

      // Set encoding 0 to later verify the font has an encoding
      var result = [];
      for (var j = 0, jj = glyphsData.length; j < jj; j++) {
        var glyphID = (glyphsData[j++] << 8) | glyphsData[j];
        if (glyphID === 0) {
          continue;
        }
        var code = j >> 1;
        result[code] = glyphID;
      }
      return result;
    },

    extractWidths: function PartialEvaluator_extractWidths(dict, xref,
                                                           descriptor,
                                                           properties) {
      var glyphsWidths = [];
      var defaultWidth = 0;
      var glyphsVMetrics = [];
      var defaultVMetrics;
      var i, ii, j, jj, start, code, widths;
      if (properties.composite) {
        defaultWidth = dict.get('DW') || 1000;

        widths = dict.get('W');
        if (widths) {
          for (i = 0, ii = widths.length; i < ii; i++) {
            start = widths[i++];
            code = xref.fetchIfRef(widths[i]);
            if (isArray(code)) {
              for (j = 0, jj = code.length; j < jj; j++) {
                glyphsWidths[start++] = code[j];
              }
            } else {
              var width = widths[++i];
              for (j = start; j <= code; j++) {
                glyphsWidths[j] = width;
              }
            }
          }
        }

        if (properties.vertical) {
          var vmetrics = (dict.get('DW2') || [880, -1000]);
          defaultVMetrics = [vmetrics[1], defaultWidth * 0.5, vmetrics[0]];
          vmetrics = dict.get('W2');
          if (vmetrics) {
            for (i = 0, ii = vmetrics.length; i < ii; i++) {
              start = vmetrics[i++];
              code = xref.fetchIfRef(vmetrics[i]);
              if (isArray(code)) {
                for (j = 0, jj = code.length; j < jj; j++) {
                  glyphsVMetrics[start++] = [code[j++], code[j++], code[j]];
                }
              } else {
                var vmetric = [vmetrics[++i], vmetrics[++i], vmetrics[++i]];
                for (j = start; j <= code; j++) {
                  glyphsVMetrics[j] = vmetric;
                }
              }
            }
          }
        }
      } else {
        var firstChar = properties.firstChar;
        widths = dict.get('Widths');
        if (widths) {
          j = firstChar;
          for (i = 0, ii = widths.length; i < ii; i++) {
            glyphsWidths[j++] = widths[i];
          }
          defaultWidth = (parseFloat(descriptor.get('MissingWidth')) || 0);
        } else {
          // Trying get the BaseFont metrics (see comment above).
          var baseFontName = dict.get('BaseFont');
          if (isName(baseFontName)) {
            var metrics = this.getBaseFontMetrics(baseFontName.name);

            glyphsWidths = this.buildCharCodeToWidth(metrics.widths,
                                                     properties);
            defaultWidth = metrics.defaultWidth;
          }
        }
      }

      // Heuristic: detection of monospace font by checking all non-zero widths
      var isMonospace = true;
      var firstWidth = defaultWidth;
      for (var glyph in glyphsWidths) {
        var glyphWidth = glyphsWidths[glyph];
        if (!glyphWidth) {
          continue;
        }
        if (!firstWidth) {
          firstWidth = glyphWidth;
          continue;
        }
        if (firstWidth !== glyphWidth) {
          isMonospace = false;
          break;
        }
      }
      if (isMonospace) {
        properties.flags |= FontFlags.FixedPitch;
      }

      properties.defaultWidth = defaultWidth;
      properties.widths = glyphsWidths;
      properties.defaultVMetrics = defaultVMetrics;
      properties.vmetrics = glyphsVMetrics;
    },

    isSerifFont: function PartialEvaluator_isSerifFont(baseFontName) {
      // Simulating descriptor flags attribute
      var fontNameWoStyle = baseFontName.split('-')[0];
      return (fontNameWoStyle in getSerifFonts()) ||
              (fontNameWoStyle.search(/serif/gi) !== -1);
    },

    getBaseFontMetrics: function PartialEvaluator_getBaseFontMetrics(name) {
      var defaultWidth = 0;
      var widths = [];
      var monospace = false;
      var stdFontMap = getStdFontMap();
      var lookupName = (stdFontMap[name] || name);
      var Metrics = getMetrics();

      if (!(lookupName in Metrics)) {
        // Use default fonts for looking up font metrics if the passed
        // font is not a base font
        if (this.isSerifFont(name)) {
          lookupName = 'Times-Roman';
        } else {
          lookupName = 'Helvetica';
        }
      }
      var glyphWidths = Metrics[lookupName];

      if (isNum(glyphWidths)) {
        defaultWidth = glyphWidths;
        monospace = true;
      } else {
        widths = glyphWidths(); // expand lazy widths array
      }

      return {
        defaultWidth: defaultWidth,
        monospace: monospace,
        widths: widths
      };
    },

    buildCharCodeToWidth:
        function PartialEvaluator_bulildCharCodeToWidth(widthsByGlyphName,
                                                        properties) {
      var widths = Object.create(null);
      var differences = properties.differences;
      var encoding = properties.defaultEncoding;
      for (var charCode = 0; charCode < 256; charCode++) {
        if (charCode in differences &&
            widthsByGlyphName[differences[charCode]]) {
          widths[charCode] = widthsByGlyphName[differences[charCode]];
          continue;
        }
        if (charCode in encoding && widthsByGlyphName[encoding[charCode]]) {
          widths[charCode] = widthsByGlyphName[encoding[charCode]];
          continue;
        }
      }
      return widths;
    },

    preEvaluateFont: function PartialEvaluator_preEvaluateFont(dict, xref) {
      var baseDict = dict;
      var type = dict.get('Subtype');
      assert(isName(type), 'invalid font Subtype');

      var composite = false;
      var uint8array;
      if (type.name === 'Type0') {
        // If font is a composite
        //  - get the descendant font
        //  - set the type according to the descendant font
        //  - get the FontDescriptor from the descendant font
        var df = dict.get('DescendantFonts');
        if (!df) {
          error('Descendant fonts are not specified');
        }
        dict = (isArray(df) ? xref.fetchIfRef(df[0]) : df);

        type = dict.get('Subtype');
        assert(isName(type), 'invalid font Subtype');
        composite = true;
      }

      var descriptor = dict.get('FontDescriptor');
      if (descriptor) {
        var hash = new MurmurHash3_64();
        var encoding = baseDict.getRaw('Encoding');
        if (isName(encoding)) {
          hash.update(encoding.name);
        } else if (isRef(encoding)) {
          hash.update(encoding.num + '_' + encoding.gen);
        } else if (isDict(encoding)) {
          var keys = encoding.getKeys();
          for (var i = 0, ii = keys.length; i < ii; i++) {
            var entry = encoding.getRaw(keys[i]);
            if (isName(entry)) {
              hash.update(entry.name);
            } else if (isRef(entry)) {
              hash.update(entry.num + '_' + entry.gen);
            } else if (isArray(entry)) { // 'Differences' entry.
              // Ideally we should check the contents of the array, but to avoid
              // parsing it here and then again in |extractDataStructures|,
              // we only use the array length for now (fixes bug1157493.pdf).
              hash.update(entry.length.toString());
            }
          }
        }

        var toUnicode = dict.get('ToUnicode') || baseDict.get('ToUnicode');
        if (isStream(toUnicode)) {
          var stream = toUnicode.str || toUnicode;
          uint8array = stream.buffer ?
            new Uint8Array(stream.buffer.buffer, 0, stream.bufferLength) :
            new Uint8Array(stream.bytes.buffer,
                           stream.start, stream.end - stream.start);
          hash.update(uint8array);

        } else if (isName(toUnicode)) {
          hash.update(toUnicode.name);
        }

        var widths = dict.get('Widths') || baseDict.get('Widths');
        if (widths) {
          uint8array = new Uint8Array(new Uint32Array(widths).buffer);
          hash.update(uint8array);
        }
      }

      return {
        descriptor: descriptor,
        dict: dict,
        baseDict: baseDict,
        composite: composite,
        type: type.name,
        hash: hash ? hash.hexdigest() : ''
      };
    },

    translateFont: function PartialEvaluator_translateFont(preEvaluatedFont,
                                                           xref) {
      var baseDict = preEvaluatedFont.baseDict;
      var dict = preEvaluatedFont.dict;
      var composite = preEvaluatedFont.composite;
      var descriptor = preEvaluatedFont.descriptor;
      var type = preEvaluatedFont.type;
      var maxCharIndex = (composite ? 0xFFFF : 0xFF);
      var cMapOptions = this.options.cMapOptions;
      var properties;

      if (!descriptor) {
        if (type === 'Type3') {
          // FontDescriptor is only required for Type3 fonts when the document
          // is a tagged pdf. Create a barbebones one to get by.
          descriptor = new Dict(null);
          descriptor.set('FontName', Name.get(type));
          descriptor.set('FontBBox', dict.get('FontBBox'));
        } else {
          // Before PDF 1.5 if the font was one of the base 14 fonts, having a
          // FontDescriptor was not required.
          // This case is here for compatibility.
          var baseFontName = dict.get('BaseFont');
          if (!isName(baseFontName)) {
            error('Base font is not specified');
          }

          // Using base font name as a font name.
          baseFontName = baseFontName.name.replace(/[,_]/g, '-');
          var metrics = this.getBaseFontMetrics(baseFontName);

          // Simulating descriptor flags attribute
          var fontNameWoStyle = baseFontName.split('-')[0];
          var flags =
            (this.isSerifFont(fontNameWoStyle) ? FontFlags.Serif : 0) |
            (metrics.monospace ? FontFlags.FixedPitch : 0) |
            (getSymbolsFonts()[fontNameWoStyle] ? FontFlags.Symbolic :
                                                  FontFlags.Nonsymbolic);

          properties = {
            type: type,
            name: baseFontName,
            widths: metrics.widths,
            defaultWidth: metrics.defaultWidth,
            flags: flags,
            firstChar: 0,
            lastChar: maxCharIndex
          };
          return this.extractDataStructures(dict, dict, xref, properties).then(
              function (properties) {
            properties.widths = this.buildCharCodeToWidth(metrics.widths,
                                                          properties);
            return new Font(baseFontName, null, properties);
          }.bind(this));
        }
      }

      // According to the spec if 'FontDescriptor' is declared, 'FirstChar',
      // 'LastChar' and 'Widths' should exist too, but some PDF encoders seem
      // to ignore this rule when a variant of a standart font is used.
      // TODO Fill the width array depending on which of the base font this is
      // a variant.
      var firstChar = (dict.get('FirstChar') || 0);
      var lastChar = (dict.get('LastChar') || maxCharIndex);

      var fontName = descriptor.get('FontName');
      var baseFont = dict.get('BaseFont');
      // Some bad PDFs have a string as the font name.
      if (isString(fontName)) {
        fontName = Name.get(fontName);
      }
      if (isString(baseFont)) {
        baseFont = Name.get(baseFont);
      }

      if (type !== 'Type3') {
        var fontNameStr = fontName && fontName.name;
        var baseFontStr = baseFont && baseFont.name;
        if (fontNameStr !== baseFontStr) {
          info('The FontDescriptor\'s FontName is "' + fontNameStr +
               '" but should be the same as the Font\'s BaseFont "' +
               baseFontStr + '"');
          // Workaround for cases where e.g. fontNameStr = 'Arial' and
          // baseFontStr = 'Arial,Bold' (needed when no font file is embedded).
          if (fontNameStr && baseFontStr &&
              baseFontStr.indexOf(fontNameStr) === 0) {
            fontName = baseFont;
          }
        }
      }
      fontName = (fontName || baseFont);

      assert(isName(fontName), 'invalid font name');

      var fontFile = descriptor.get('FontFile', 'FontFile2', 'FontFile3');
      if (fontFile) {
        if (fontFile.dict) {
          var subtype = fontFile.dict.get('Subtype');
          if (subtype) {
            subtype = subtype.name;
          }
          var length1 = fontFile.dict.get('Length1');
          var length2 = fontFile.dict.get('Length2');
          var length3 = fontFile.dict.get('Length3');
        }
      }

      properties = {
        type: type,
        name: fontName.name,
        subtype: subtype,
        file: fontFile,
        length1: length1,
        length2: length2,
        length3: length3,
        loadedName: baseDict.loadedName,
        composite: composite,
        wideChars: composite,
        fixedPitch: false,
        fontMatrix: (dict.get('FontMatrix') || FONT_IDENTITY_MATRIX),
        firstChar: firstChar || 0,
        lastChar: (lastChar || maxCharIndex),
        bbox: descriptor.get('FontBBox'),
        ascent: descriptor.get('Ascent'),
        descent: descriptor.get('Descent'),
        xHeight: descriptor.get('XHeight'),
        capHeight: descriptor.get('CapHeight'),
        flags: descriptor.get('Flags'),
        italicAngle: descriptor.get('ItalicAngle'),
        coded: false
      };

      var cMapPromise;
      if (composite) {
        var cidEncoding = baseDict.get('Encoding');
        if (isName(cidEncoding)) {
          properties.cidEncoding = cidEncoding.name;
        }
        cMapPromise = CMapFactory.create(cidEncoding, cMapOptions, null).then(
            function (cMap) {
          properties.cMap = cMap;
          properties.vertical = properties.cMap.vertical;
        });
      } else {
        cMapPromise = Promise.resolve(undefined);
      }

      return cMapPromise.then(function () {
        return this.extractDataStructures(dict, baseDict, xref, properties);
      }.bind(this)).then(function (properties) {
        this.extractWidths(dict, xref, descriptor, properties);

        if (type === 'Type3') {
          properties.isType3Font = true;
        }

        return new Font(fontName.name, fontFile, properties);
      }.bind(this));
    }
  };

  return PartialEvaluator;
})();

var TranslatedFont = (function TranslatedFontClosure() {
  function TranslatedFont(loadedName, font, dict) {
    this.loadedName = loadedName;
    this.font = font;
    this.dict = dict;
    this.type3Loaded = null;
    this.sent = false;
  }
  TranslatedFont.prototype = {
    send: function (handler) {
      if (this.sent) {
        return;
      }
      var fontData = this.font.exportData();
      handler.send('commonobj', [
        this.loadedName,
        'Font',
        fontData
      ]);
      this.sent = true;
    },
    loadType3Data: function (evaluator, resources, parentOperatorList, task) {
      assert(this.font.isType3Font);

      if (this.type3Loaded) {
        return this.type3Loaded;
      }

      var translatedFont = this.font;
      var loadCharProcsPromise = Promise.resolve();
      var charProcs = this.dict.get('CharProcs');
      var fontResources = this.dict.get('Resources') || resources;
      var charProcKeys = charProcs.getKeys();
      var charProcOperatorList = Object.create(null);
      for (var i = 0, n = charProcKeys.length; i < n; ++i) {
        loadCharProcsPromise = loadCharProcsPromise.then(function (key) {
          var glyphStream = charProcs.get(key);
          var operatorList = new OperatorList();
          return evaluator.getOperatorList(glyphStream, task, fontResources,
                                           operatorList).then(function () {
            charProcOperatorList[key] = operatorList.getIR();

            // Add the dependencies to the parent operator list so they are
            // resolved before sub operator list is executed synchronously.
            parentOperatorList.addDependencies(operatorList.dependencies);
          }, function (reason) {
            warn('Type3 font resource \"' + key + '\" is not available');
            var operatorList = new OperatorList();
            charProcOperatorList[key] = operatorList.getIR();
          });
        }.bind(this, charProcKeys[i]));
      }
      this.type3Loaded = loadCharProcsPromise.then(function () {
        translatedFont.charProcOperatorList = charProcOperatorList;
      });
      return this.type3Loaded;
    }
  };
  return TranslatedFont;
})();

var OperatorList = (function OperatorListClosure() {
  var CHUNK_SIZE = 1000;
  var CHUNK_SIZE_ABOUT = CHUNK_SIZE - 5; // close to chunk size

  function getTransfers(queue) {
    var transfers = [];
    var fnArray = queue.fnArray, argsArray = queue.argsArray;
    for (var i = 0, ii = queue.length; i < ii; i++) {
      switch (fnArray[i]) {
        case OPS.paintInlineImageXObject:
        case OPS.paintInlineImageXObjectGroup:
        case OPS.paintImageMaskXObject:
          var arg = argsArray[i][0]; // first param in imgData
          if (!arg.cached) {
            transfers.push(arg.data.buffer);
          }
          break;
      }
    }
    return transfers;
  }

  function OperatorList(intent, messageHandler, pageIndex) {
    this.messageHandler = messageHandler;
    this.fnArray = [];
    this.argsArray = [];
    this.dependencies = Object.create(null);
    this._totalLength = 0;
    this.pageIndex = pageIndex;
    this.intent = intent;
  }

  OperatorList.prototype = {
    get length() {
      return this.argsArray.length;
    },

    /**
     * @returns {number} The total length of the entire operator list,
     *                   since `this.length === 0` after flushing.
     */
    get totalLength() {
      return (this._totalLength + this.length);
    },

    addOp: function(fn, args) {
      this.fnArray.push(fn);
      this.argsArray.push(args);
      if (this.messageHandler) {
        if (this.fnArray.length >= CHUNK_SIZE) {
          this.flush();
        } else if (this.fnArray.length >= CHUNK_SIZE_ABOUT &&
                   (fn === OPS.restore || fn === OPS.endText)) {
          // heuristic to flush on boundary of restore or endText
          this.flush();
        }
      }
    },

    addDependency: function(dependency) {
      if (dependency in this.dependencies) {
        return;
      }
      this.dependencies[dependency] = true;
      this.addOp(OPS.dependency, [dependency]);
    },

    addDependencies: function(dependencies) {
      for (var key in dependencies) {
        this.addDependency(key);
      }
    },

    addOpList: function(opList) {
      Util.extendObj(this.dependencies, opList.dependencies);
      for (var i = 0, ii = opList.length; i < ii; i++) {
        this.addOp(opList.fnArray[i], opList.argsArray[i]);
      }
    },

    getIR: function() {
      return {
        fnArray: this.fnArray,
        argsArray: this.argsArray,
        length: this.length
      };
    },

    flush: function(lastChunk) {
      if (this.intent !== 'oplist') {
        new QueueOptimizer().optimize(this);
      }
      var transfers = getTransfers(this);
      var length = this.length;
      this._totalLength += length;

      this.messageHandler.send('RenderPageChunk', {
        operatorList: {
          fnArray: this.fnArray,
          argsArray: this.argsArray,
          lastChunk: lastChunk,
          length: length
        },
        pageIndex: this.pageIndex,
        intent: this.intent
      }, transfers);
      this.dependencies = Object.create(null);
      this.fnArray.length = 0;
      this.argsArray.length = 0;
    }
  };

  return OperatorList;
})();

var StateManager = (function StateManagerClosure() {
  function StateManager(initialState) {
    this.state = initialState;
    this.stateStack = [];
  }
  StateManager.prototype = {
    save: function () {
      var old = this.state;
      this.stateStack.push(this.state);
      this.state = old.clone();
    },
    restore: function () {
      var prev = this.stateStack.pop();
      if (prev) {
        this.state = prev;
      }
    },
    transform: function (args) {
      this.state.ctm = Util.transform(this.state.ctm, args);
    }
  };
  return StateManager;
})();

var TextState = (function TextStateClosure() {
  function TextState() {
    this.ctm = new Float32Array(IDENTITY_MATRIX);
    this.fontSize = 0;
    this.font = null;
    this.fontMatrix = FONT_IDENTITY_MATRIX;
    this.textMatrix = IDENTITY_MATRIX.slice();
    this.textLineMatrix = IDENTITY_MATRIX.slice();
    this.charSpacing = 0;
    this.wordSpacing = 0;
    this.leading = 0;
    this.textHScale = 1;
    this.textRise = 0;
  }

  TextState.prototype = {
    setTextMatrix: function TextState_setTextMatrix(a, b, c, d, e, f) {
      var m = this.textMatrix;
      m[0] = a; m[1] = b; m[2] = c; m[3] = d; m[4] = e; m[5] = f;
    },
    setTextLineMatrix: function TextState_setTextMatrix(a, b, c, d, e, f) {
      var m = this.textLineMatrix;
      m[0] = a; m[1] = b; m[2] = c; m[3] = d; m[4] = e; m[5] = f;
    },
    translateTextMatrix: function TextState_translateTextMatrix(x, y) {
      var m = this.textMatrix;
      m[4] = m[0] * x + m[2] * y + m[4];
      m[5] = m[1] * x + m[3] * y + m[5];
    },
    translateTextLineMatrix: function TextState_translateTextMatrix(x, y) {
      var m = this.textLineMatrix;
      m[4] = m[0] * x + m[2] * y + m[4];
      m[5] = m[1] * x + m[3] * y + m[5];
    },
    calcRenderMatrix: function TextState_calcRendeMatrix(ctm) {
      // 9.4.4 Text Space Details
      var tsm = [this.fontSize * this.textHScale, 0,
                0, this.fontSize,
                0, this.textRise];
      return Util.transform(ctm, Util.transform(this.textMatrix, tsm));
    },
    carriageReturn: function TextState_carriageReturn() {
      this.translateTextLineMatrix(0, -this.leading);
      this.textMatrix = this.textLineMatrix.slice();
    },
    clone: function TextState_clone() {
      var clone = Object.create(this);
      clone.textMatrix = this.textMatrix.slice();
      clone.textLineMatrix = this.textLineMatrix.slice();
      clone.fontMatrix = this.fontMatrix.slice();
      return clone;
    }
  };
  return TextState;
})();

var EvalState = (function EvalStateClosure() {
  function EvalState() {
    this.ctm = new Float32Array(IDENTITY_MATRIX);
    this.font = null;
    this.textRenderingMode = TextRenderingMode.FILL;
    this.fillColorSpace = ColorSpace.singletons.gray;
    this.strokeColorSpace = ColorSpace.singletons.gray;
  }
  EvalState.prototype = {
    clone: function CanvasExtraState_clone() {
      return Object.create(this);
    },
  };
  return EvalState;
})();

var EvaluatorPreprocessor = (function EvaluatorPreprocessorClosure() {
  // Specifies properties for each command
  //
  // If variableArgs === true: [0, `numArgs`] expected
  // If variableArgs === false: exactly `numArgs` expected
  var getOPMap = getLookupTableFactory(function (t) {
    // Graphic state
    t['w'] = { id: OPS.setLineWidth, numArgs: 1, variableArgs: false };
    t['J'] = { id: OPS.setLineCap, numArgs: 1, variableArgs: false };
    t['j'] = { id: OPS.setLineJoin, numArgs: 1, variableArgs: false };
    t['M'] = { id: OPS.setMiterLimit, numArgs: 1, variableArgs: false };
    t['d'] = { id: OPS.setDash, numArgs: 2, variableArgs: false };
    t['ri'] = { id: OPS.setRenderingIntent, numArgs: 1, variableArgs: false };
    t['i'] = { id: OPS.setFlatness, numArgs: 1, variableArgs: false };
    t['gs'] = { id: OPS.setGState, numArgs: 1, variableArgs: false };
    t['q'] = { id: OPS.save, numArgs: 0, variableArgs: false };
    t['Q'] = { id: OPS.restore, numArgs: 0, variableArgs: false };
    t['cm'] = { id: OPS.transform, numArgs: 6, variableArgs: false };

    // Path
    t['m'] = { id: OPS.moveTo, numArgs: 2, variableArgs: false };
    t['l'] = { id: OPS.lineTo, numArgs: 2, variableArgs: false };
    t['c'] = { id: OPS.curveTo, numArgs: 6, variableArgs: false };
    t['v'] = { id: OPS.curveTo2, numArgs: 4, variableArgs: false };
    t['y'] = { id: OPS.curveTo3, numArgs: 4, variableArgs: false };
    t['h'] = { id: OPS.closePath, numArgs: 0, variableArgs: false };
    t['re'] = { id: OPS.rectangle, numArgs: 4, variableArgs: false };
    t['S'] = { id: OPS.stroke, numArgs: 0, variableArgs: false };
    t['s'] = { id: OPS.closeStroke, numArgs: 0, variableArgs: false };
    t['f'] = { id: OPS.fill, numArgs: 0, variableArgs: false };
    t['F'] = { id: OPS.fill, numArgs: 0, variableArgs: false };
    t['f*'] = { id: OPS.eoFill, numArgs: 0, variableArgs: false };
    t['B'] = { id: OPS.fillStroke, numArgs: 0, variableArgs: false };
    t['B*'] = { id: OPS.eoFillStroke, numArgs: 0, variableArgs: false };
    t['b'] = { id: OPS.closeFillStroke, numArgs: 0, variableArgs: false };
    t['b*'] = { id: OPS.closeEOFillStroke, numArgs: 0, variableArgs: false };
    t['n'] = { id: OPS.endPath, numArgs: 0, variableArgs: false };

    // Clipping
    t['W'] = { id: OPS.clip, numArgs: 0, variableArgs: false };
    t['W*'] = { id: OPS.eoClip, numArgs: 0, variableArgs: false };

    // Text
    t['BT'] = { id: OPS.beginText, numArgs: 0, variableArgs: false };
    t['ET'] = { id: OPS.endText, numArgs: 0, variableArgs: false };
    t['Tc'] = { id: OPS.setCharSpacing, numArgs: 1, variableArgs: false };
    t['Tw'] = { id: OPS.setWordSpacing, numArgs: 1, variableArgs: false };
    t['Tz'] = { id: OPS.setHScale, numArgs: 1, variableArgs: false };
    t['TL'] = { id: OPS.setLeading, numArgs: 1, variableArgs: false };
    t['Tf'] = { id: OPS.setFont, numArgs: 2, variableArgs: false };
    t['Tr'] = { id: OPS.setTextRenderingMode, numArgs: 1, variableArgs: false };
    t['Ts'] = { id: OPS.setTextRise, numArgs: 1, variableArgs: false };
    t['Td'] = { id: OPS.moveText, numArgs: 2, variableArgs: false };
    t['TD'] = { id: OPS.setLeadingMoveText, numArgs: 2, variableArgs: false };
    t['Tm'] = { id: OPS.setTextMatrix, numArgs: 6, variableArgs: false };
    t['T*'] = { id: OPS.nextLine, numArgs: 0, variableArgs: false };
    t['Tj'] = { id: OPS.showText, numArgs: 1, variableArgs: false };
    t['TJ'] = { id: OPS.showSpacedText, numArgs: 1, variableArgs: false };
    t['\''] = { id: OPS.nextLineShowText, numArgs: 1, variableArgs: false };
    t['"'] = { id: OPS.nextLineSetSpacingShowText, numArgs: 3,
               variableArgs: false };

    // Type3 fonts
    t['d0'] = { id: OPS.setCharWidth, numArgs: 2, variableArgs: false };
    t['d1'] = { id: OPS.setCharWidthAndBounds, numArgs: 6,
                variableArgs: false };

    // Color
    t['CS'] = { id: OPS.setStrokeColorSpace, numArgs: 1, variableArgs: false };
    t['cs'] = { id: OPS.setFillColorSpace, numArgs: 1, variableArgs: false };
    t['SC'] = { id: OPS.setStrokeColor, numArgs: 4, variableArgs: true };
    t['SCN'] = { id: OPS.setStrokeColorN, numArgs: 33, variableArgs: true };
    t['sc'] = { id: OPS.setFillColor, numArgs: 4, variableArgs: true };
    t['scn'] = { id: OPS.setFillColorN, numArgs: 33, variableArgs: true };
    t['G'] = { id: OPS.setStrokeGray, numArgs: 1, variableArgs: false };
    t['g'] = { id: OPS.setFillGray, numArgs: 1, variableArgs: false };
    t['RG'] = { id: OPS.setStrokeRGBColor, numArgs: 3, variableArgs: false };
    t['rg'] = { id: OPS.setFillRGBColor, numArgs: 3, variableArgs: false };
    t['K'] = { id: OPS.setStrokeCMYKColor, numArgs: 4, variableArgs: false };
    t['k'] = { id: OPS.setFillCMYKColor, numArgs: 4, variableArgs: false };

    // Shading
    t['sh'] = { id: OPS.shadingFill, numArgs: 1, variableArgs: false };

    // Images
    t['BI'] = { id: OPS.beginInlineImage, numArgs: 0, variableArgs: false };
    t['ID'] = { id: OPS.beginImageData, numArgs: 0, variableArgs: false };
    t['EI'] = { id: OPS.endInlineImage, numArgs: 1, variableArgs: false };

    // XObjects
    t['Do'] = { id: OPS.paintXObject, numArgs: 1, variableArgs: false };
    t['MP'] = { id: OPS.markPoint, numArgs: 1, variableArgs: false };
    t['DP'] = { id: OPS.markPointProps, numArgs: 2, variableArgs: false };
    t['BMC'] = { id: OPS.beginMarkedContent, numArgs: 1, variableArgs: false };
    t['BDC'] = { id: OPS.beginMarkedContentProps, numArgs: 2,
                 variableArgs: false };
    t['EMC'] = { id: OPS.endMarkedContent, numArgs: 0, variableArgs: false };

    // Compatibility
    t['BX'] = { id: OPS.beginCompat, numArgs: 0, variableArgs: false };
    t['EX'] = { id: OPS.endCompat, numArgs: 0, variableArgs: false };

    // (reserved partial commands for the lexer)
    t['BM'] = null;
    t['BD'] = null;
    t['true'] = null;
    t['fa'] = null;
    t['fal'] = null;
    t['fals'] = null;
    t['false'] = null;
    t['nu'] = null;
    t['nul'] = null;
    t['null'] = null;
  });

  function EvaluatorPreprocessor(stream, xref, stateManager) {
    this.opMap = getOPMap();
    // TODO(mduan): pass array of knownCommands rather than this.opMap
    // dictionary
    this.parser = new Parser(new Lexer(stream, this.opMap), false, xref);
    this.stateManager = stateManager;
    this.nonProcessedArgs = [];
  }

  EvaluatorPreprocessor.prototype = {
    get savedStatesDepth() {
      return this.stateManager.stateStack.length;
    },

    // |operation| is an object with two fields:
    //
    // - |fn| is an out param.
    //
    // - |args| is an inout param. On entry, it should have one of two values.
    //
    //   - An empty array. This indicates that the caller is providing the
    //     array in which the args will be stored in. The caller should use
    //     this value if it can reuse a single array for each call to read().
    //
    //   - |null|. This indicates that the caller needs this function to create
    //     the array in which any args are stored in. If there are zero args,
    //     this function will leave |operation.args| as |null| (thus avoiding
    //     allocations that would occur if we used an empty array to represent
    //     zero arguments). Otherwise, it will replace |null| with a new array
    //     containing the arguments. The caller should use this value if it
    //     cannot reuse an array for each call to read().
    //
    // These two modes are present because this function is very hot and so
    // avoiding allocations where possible is worthwhile.
    //
    read: function EvaluatorPreprocessor_read(operation) {
      var args = operation.args;
      while (true) {
        var obj = this.parser.getObj();
        if (isCmd(obj)) {
          var cmd = obj.cmd;
          // Check that the command is valid
          var opSpec = this.opMap[cmd];
          if (!opSpec) {
            warn('Unknown command "' + cmd + '"');
            continue;
          }

          var fn = opSpec.id;
          var numArgs = opSpec.numArgs;
          var argsLength = args !== null ? args.length : 0;

          if (!opSpec.variableArgs) {
            // Postscript commands can be nested, e.g. /F2 /GS2 gs 5.711 Tf
            if (argsLength !== numArgs) {
              var nonProcessedArgs = this.nonProcessedArgs;
              while (argsLength > numArgs) {
                nonProcessedArgs.push(args.shift());
                argsLength--;
              }
              while (argsLength < numArgs && nonProcessedArgs.length !== 0) {
                if (!args) {
                  args = [];
                }
                args.unshift(nonProcessedArgs.pop());
                argsLength++;
              }
            }

            if (argsLength < numArgs) {
              // If we receive too few args, it's not possible to possible
              // to execute the command, so skip the command
              info('Command ' + fn + ': because expected ' +
                   numArgs + ' args, but received ' + argsLength +
                   ' args; skipping');
              args = null;
              continue;
            }
          } else if (argsLength > numArgs) {
            info('Command ' + fn + ': expected [0,' + numArgs +
                 '] args, but received ' + argsLength + ' args');
          }

          // TODO figure out how to type-check vararg functions
          this.preprocessCommand(fn, args);

          operation.fn = fn;
          operation.args = args;
          return true;
        } else {
          if (isEOF(obj)) {
            return false; // no more commands
          }
          // argument
          if (obj !== null) {
            if (!args) {
              args = [];
            }
            args.push(obj);
            assert(args.length <= 33, 'Too many arguments');
          }
        }
      }
    },

    preprocessCommand:
        function EvaluatorPreprocessor_preprocessCommand(fn, args) {
      switch (fn | 0) {
        case OPS.save:
          this.stateManager.save();
          break;
        case OPS.restore:
          this.stateManager.restore();
          break;
        case OPS.transform:
          this.stateManager.transform(args);
          break;
      }
    }
  };
  return EvaluatorPreprocessor;
})();

var QueueOptimizer = (function QueueOptimizerClosure() {
  function addState(parentState, pattern, fn) {
    var state = parentState;
    for (var i = 0, ii = pattern.length - 1; i < ii; i++) {
      var item = pattern[i];
      state = (state[item] || (state[item] = []));
    }
    state[pattern[pattern.length - 1]] = fn;
  }

  function handlePaintSolidColorImageMask(iFirstSave, count, fnArray,
                                          argsArray) {
    // Handles special case of mainly LaTeX documents which use image masks to
    // draw lines with the current fill style.
    // 'count' groups of (save, transform, paintImageMaskXObject, restore)+
    // have been found at iFirstSave.
    var iFirstPIMXO = iFirstSave + 2;
    for (var i = 0; i < count; i++) {
      var arg = argsArray[iFirstPIMXO + 4 * i];
      var imageMask = arg.length === 1 && arg[0];
      if (imageMask && imageMask.width === 1 && imageMask.height === 1 &&
          (!imageMask.data.length ||
           (imageMask.data.length === 1 && imageMask.data[0] === 0))) {
        fnArray[iFirstPIMXO + 4 * i] = OPS.paintSolidColorImageMask;
        continue;
      }
      break;
    }
    return count - i;
  }

  var InitialState = [];

  // This replaces (save, transform, paintInlineImageXObject, restore)+
  // sequences with one |paintInlineImageXObjectGroup| operation.
  addState(InitialState,
    [OPS.save, OPS.transform, OPS.paintInlineImageXObject, OPS.restore],
    function foundInlineImageGroup(context) {
      var MIN_IMAGES_IN_INLINE_IMAGES_BLOCK = 10;
      var MAX_IMAGES_IN_INLINE_IMAGES_BLOCK = 200;
      var MAX_WIDTH = 1000;
      var IMAGE_PADDING = 1;

      var fnArray = context.fnArray, argsArray = context.argsArray;
      var curr = context.iCurr;
      var iFirstSave = curr - 3;
      var iFirstTransform = curr - 2;
      var iFirstPIIXO = curr - 1;

      // Look for the quartets.
      var i = iFirstSave + 4;
      var ii = fnArray.length;
      while (i + 3 < ii) {
        if (fnArray[i] !== OPS.save ||
            fnArray[i + 1] !== OPS.transform ||
            fnArray[i + 2] !== OPS.paintInlineImageXObject ||
            fnArray[i + 3] !== OPS.restore) {
          break;    // ops don't match
        }
        i += 4;
      }

      // At this point, i is the index of the first op past the last valid
      // quartet.
      var count = Math.min((i - iFirstSave) / 4,
                           MAX_IMAGES_IN_INLINE_IMAGES_BLOCK);
      if (count < MIN_IMAGES_IN_INLINE_IMAGES_BLOCK) {
        return i;
      }

      // assuming that heights of those image is too small (~1 pixel)
      // packing as much as possible by lines
      var maxX = 0;
      var map = [], maxLineHeight = 0;
      var currentX = IMAGE_PADDING, currentY = IMAGE_PADDING;
      var q;
      for (q = 0; q < count; q++) {
        var transform = argsArray[iFirstTransform + (q << 2)];
        var img = argsArray[iFirstPIIXO + (q << 2)][0];
        if (currentX + img.width > MAX_WIDTH) {
          // starting new line
          maxX = Math.max(maxX, currentX);
          currentY += maxLineHeight + 2 * IMAGE_PADDING;
          currentX = 0;
          maxLineHeight = 0;
        }
        map.push({
          transform: transform,
          x: currentX, y: currentY,
          w: img.width, h: img.height
        });
        currentX += img.width + 2 * IMAGE_PADDING;
        maxLineHeight = Math.max(maxLineHeight, img.height);
      }
      var imgWidth = Math.max(maxX, currentX) + IMAGE_PADDING;
      var imgHeight = currentY + maxLineHeight + IMAGE_PADDING;
      var imgData = new Uint8Array(imgWidth * imgHeight * 4);
      var imgRowSize = imgWidth << 2;
      for (q = 0; q < count; q++) {
        var data = argsArray[iFirstPIIXO + (q << 2)][0].data;
        // Copy image by lines and extends pixels into padding.
        var rowSize = map[q].w << 2;
        var dataOffset = 0;
        var offset = (map[q].x + map[q].y * imgWidth) << 2;
        imgData.set(data.subarray(0, rowSize), offset - imgRowSize);
        for (var k = 0, kk = map[q].h; k < kk; k++) {
          imgData.set(data.subarray(dataOffset, dataOffset + rowSize), offset);
          dataOffset += rowSize;
          offset += imgRowSize;
        }
        imgData.set(data.subarray(dataOffset - rowSize, dataOffset), offset);
        while (offset >= 0) {
          data[offset - 4] = data[offset];
          data[offset - 3] = data[offset + 1];
          data[offset - 2] = data[offset + 2];
          data[offset - 1] = data[offset + 3];
          data[offset + rowSize] = data[offset + rowSize - 4];
          data[offset + rowSize + 1] = data[offset + rowSize - 3];
          data[offset + rowSize + 2] = data[offset + rowSize - 2];
          data[offset + rowSize + 3] = data[offset + rowSize - 1];
          offset -= imgRowSize;
        }
      }

      // Replace queue items.
      fnArray.splice(iFirstSave, count * 4, OPS.paintInlineImageXObjectGroup);
      argsArray.splice(iFirstSave, count * 4,
        [{ width: imgWidth, height: imgHeight, kind: ImageKind.RGBA_32BPP,
           data: imgData }, map]);

      return iFirstSave + 1;
    });

  // This replaces (save, transform, paintImageMaskXObject, restore)+
  // sequences with one |paintImageMaskXObjectGroup| or one
  // |paintImageMaskXObjectRepeat| operation.
  addState(InitialState,
    [OPS.save, OPS.transform, OPS.paintImageMaskXObject, OPS.restore],
    function foundImageMaskGroup(context) {
      var MIN_IMAGES_IN_MASKS_BLOCK = 10;
      var MAX_IMAGES_IN_MASKS_BLOCK = 100;
      var MAX_SAME_IMAGES_IN_MASKS_BLOCK = 1000;

      var fnArray = context.fnArray, argsArray = context.argsArray;
      var curr = context.iCurr;
      var iFirstSave = curr - 3;
      var iFirstTransform = curr - 2;
      var iFirstPIMXO = curr - 1;

      // Look for the quartets.
      var i = iFirstSave + 4;
      var ii = fnArray.length;
      while (i + 3 < ii) {
        if (fnArray[i] !== OPS.save ||
            fnArray[i + 1] !== OPS.transform ||
            fnArray[i + 2] !== OPS.paintImageMaskXObject ||
            fnArray[i + 3] !== OPS.restore) {
          break;    // ops don't match
        }
        i += 4;
      }

      // At this point, i is the index of the first op past the last valid
      // quartet.
      var count = (i - iFirstSave) / 4;
      count = handlePaintSolidColorImageMask(iFirstSave, count, fnArray,
                                             argsArray);
      if (count < MIN_IMAGES_IN_MASKS_BLOCK) {
        return i;
      }

      var q;
      var isSameImage = false;
      var iTransform, transformArgs;
      var firstPIMXOArg0 = argsArray[iFirstPIMXO][0];
      if (argsArray[iFirstTransform][1] === 0 &&
          argsArray[iFirstTransform][2] === 0) {
        isSameImage = true;
        var firstTransformArg0 = argsArray[iFirstTransform][0];
        var firstTransformArg3 = argsArray[iFirstTransform][3];
        iTransform = iFirstTransform + 4;
        var iPIMXO = iFirstPIMXO + 4;
        for (q = 1; q < count; q++, iTransform += 4, iPIMXO += 4) {
          transformArgs = argsArray[iTransform];
          if (argsArray[iPIMXO][0] !== firstPIMXOArg0 ||
              transformArgs[0] !== firstTransformArg0 ||
              transformArgs[1] !== 0 ||
              transformArgs[2] !== 0 ||
              transformArgs[3] !== firstTransformArg3) {
            if (q < MIN_IMAGES_IN_MASKS_BLOCK) {
              isSameImage = false;
            } else {
              count = q;
            }
            break; // different image or transform
          }
        }
      }

      if (isSameImage) {
        count = Math.min(count, MAX_SAME_IMAGES_IN_MASKS_BLOCK);
        var positions = new Float32Array(count * 2);
        iTransform = iFirstTransform;
        for (q = 0; q < count; q++, iTransform += 4) {
          transformArgs = argsArray[iTransform];
          positions[(q << 1)] = transformArgs[4];
          positions[(q << 1) + 1] = transformArgs[5];
        }

        // Replace queue items.
        fnArray.splice(iFirstSave, count * 4, OPS.paintImageMaskXObjectRepeat);
        argsArray.splice(iFirstSave, count * 4,
          [firstPIMXOArg0, firstTransformArg0, firstTransformArg3, positions]);
      } else {
        count = Math.min(count, MAX_IMAGES_IN_MASKS_BLOCK);
        var images = [];
        for (q = 0; q < count; q++) {
          transformArgs = argsArray[iFirstTransform + (q << 2)];
          var maskParams = argsArray[iFirstPIMXO + (q << 2)][0];
          images.push({ data: maskParams.data, width: maskParams.width,
                        height: maskParams.height,
                        transform: transformArgs });
        }

        // Replace queue items.
        fnArray.splice(iFirstSave, count * 4, OPS.paintImageMaskXObjectGroup);
        argsArray.splice(iFirstSave, count * 4, [images]);
      }

      return iFirstSave + 1;
    });

  // This replaces (save, transform, paintImageXObject, restore)+ sequences
  // with one paintImageXObjectRepeat operation, if the |transform| and
  // |paintImageXObjectRepeat| ops are appropriate.
  addState(InitialState,
    [OPS.save, OPS.transform, OPS.paintImageXObject, OPS.restore],
    function (context) {
      var MIN_IMAGES_IN_BLOCK = 3;
      var MAX_IMAGES_IN_BLOCK = 1000;

      var fnArray = context.fnArray, argsArray = context.argsArray;
      var curr = context.iCurr;
      var iFirstSave = curr - 3;
      var iFirstTransform = curr - 2;
      var iFirstPIXO = curr - 1;
      var iFirstRestore = curr;

      if (argsArray[iFirstTransform][1] !== 0 ||
          argsArray[iFirstTransform][2] !== 0) {
        return iFirstRestore + 1;   // transform has the wrong form
      }

      // Look for the quartets.
      var firstPIXOArg0 = argsArray[iFirstPIXO][0];
      var firstTransformArg0 = argsArray[iFirstTransform][0];
      var firstTransformArg3 = argsArray[iFirstTransform][3];
      var i = iFirstSave + 4;
      var ii = fnArray.length;
      while (i + 3 < ii) {
        if (fnArray[i] !== OPS.save ||
            fnArray[i + 1] !== OPS.transform ||
            fnArray[i + 2] !== OPS.paintImageXObject ||
            fnArray[i + 3] !== OPS.restore) {
          break;    // ops don't match
        }
        if (argsArray[i + 1][0] !== firstTransformArg0 ||
            argsArray[i + 1][1] !== 0 ||
            argsArray[i + 1][2] !== 0 ||
            argsArray[i + 1][3] !== firstTransformArg3) {
          break;    // transforms don't match
        }
        if (argsArray[i + 2][0] !== firstPIXOArg0) {
          break;    // images don't match
        }
        i += 4;
      }

      // At this point, i is the index of the first op past the last valid
      // quartet.
      var count = Math.min((i - iFirstSave) / 4, MAX_IMAGES_IN_BLOCK);
      if (count < MIN_IMAGES_IN_BLOCK) {
        return i;
      }

      // Extract the (x,y) positions from all of the matching transforms.
      var positions = new Float32Array(count * 2);
      var iTransform = iFirstTransform;
      for (var q = 0; q < count; q++, iTransform += 4) {
        var transformArgs = argsArray[iTransform];
        positions[(q << 1)] = transformArgs[4];
        positions[(q << 1) + 1] = transformArgs[5];
      }

      // Replace queue items.
      var args = [firstPIXOArg0, firstTransformArg0, firstTransformArg3,
                  positions];
      fnArray.splice(iFirstSave, count * 4, OPS.paintImageXObjectRepeat);
      argsArray.splice(iFirstSave, count * 4, args);

      return iFirstSave + 1;
    });

  // This replaces (beginText, setFont, setTextMatrix, showText, endText)+
  // sequences with (beginText, setFont, (setTextMatrix, showText)+, endText)+
  // sequences, if the font for each one is the same.
  addState(InitialState,
    [OPS.beginText, OPS.setFont, OPS.setTextMatrix, OPS.showText, OPS.endText],
    function (context) {
      var MIN_CHARS_IN_BLOCK = 3;
      var MAX_CHARS_IN_BLOCK = 1000;

      var fnArray = context.fnArray, argsArray = context.argsArray;
      var curr = context.iCurr;
      var iFirstBeginText = curr - 4;
      var iFirstSetFont = curr - 3;
      var iFirstSetTextMatrix = curr - 2;
      var iFirstShowText = curr - 1;
      var iFirstEndText = curr;

      // Look for the quintets.
      var firstSetFontArg0 = argsArray[iFirstSetFont][0];
      var firstSetFontArg1 = argsArray[iFirstSetFont][1];
      var i = iFirstBeginText + 5;
      var ii = fnArray.length;
      while (i + 4 < ii) {
        if (fnArray[i] !== OPS.beginText ||
            fnArray[i + 1] !== OPS.setFont ||
            fnArray[i + 2] !== OPS.setTextMatrix ||
            fnArray[i + 3] !== OPS.showText ||
            fnArray[i + 4] !== OPS.endText) {
          break;    // ops don't match
        }
        if (argsArray[i + 1][0] !== firstSetFontArg0 ||
            argsArray[i + 1][1] !== firstSetFontArg1) {
          break;    // fonts don't match
        }
        i += 5;
      }

      // At this point, i is the index of the first op past the last valid
      // quintet.
      var count = Math.min(((i - iFirstBeginText) / 5), MAX_CHARS_IN_BLOCK);
      if (count < MIN_CHARS_IN_BLOCK) {
        return i;
      }

      // If the preceding quintet is (<something>, setFont, setTextMatrix,
      // showText, endText), include that as well. (E.g. <something> might be
      // |dependency|.)
      var iFirst = iFirstBeginText;
      if (iFirstBeginText >= 4 &&
          fnArray[iFirstBeginText - 4] === fnArray[iFirstSetFont] &&
          fnArray[iFirstBeginText - 3] === fnArray[iFirstSetTextMatrix] &&
          fnArray[iFirstBeginText - 2] === fnArray[iFirstShowText] &&
          fnArray[iFirstBeginText - 1] === fnArray[iFirstEndText] &&
          argsArray[iFirstBeginText - 4][0] === firstSetFontArg0 &&
          argsArray[iFirstBeginText - 4][1] === firstSetFontArg1) {
        count++;
        iFirst -= 5;
      }

      // Remove (endText, beginText, setFont) trios.
      var iEndText = iFirst + 4;
      for (var q = 1; q < count; q++) {
        fnArray.splice(iEndText, 3);
        argsArray.splice(iEndText, 3);
        iEndText += 2;
      }

      return iEndText + 1;
    });

  function QueueOptimizer() {}

  QueueOptimizer.prototype = {
    optimize: function QueueOptimizer_optimize(queue) {
      var fnArray = queue.fnArray, argsArray = queue.argsArray;
      var context = {
        iCurr: 0,
        fnArray: fnArray,
        argsArray: argsArray
      };
      var state;
      var i = 0, ii = fnArray.length;
      while (i < ii) {
        state = (state || InitialState)[fnArray[i]];
        if (typeof state === 'function') { // we found some handler
          context.iCurr = i;
          // state() returns the index of the first non-matching op (if we
          // didn't match) or the first op past the modified ops (if we did
          // match and replace).
          i = state(context);
          state = undefined;    // reset the state machine
          ii = context.fnArray.length;
        } else {
          i++;
        }
      }
    }
  };
  return QueueOptimizer;
})();

exports.OperatorList = OperatorList;
exports.PartialEvaluator = PartialEvaluator;
}));


(function (root, factory) {
  {
    factory((root.pdfjsCoreAnnotation = {}), root.pdfjsSharedUtil,
      root.pdfjsCorePrimitives, root.pdfjsCoreStream, root.pdfjsCoreColorSpace,
      root.pdfjsCoreObj, root.pdfjsCoreEvaluator);
  }
}(this, function (exports, sharedUtil, corePrimitives, coreStream,
                  coreColorSpace, coreObj, coreEvaluator) {

var AnnotationBorderStyleType = sharedUtil.AnnotationBorderStyleType;
var AnnotationFlag = sharedUtil.AnnotationFlag;
var AnnotationType = sharedUtil.AnnotationType;
var OPS = sharedUtil.OPS;
var Util = sharedUtil.Util;
var isBool = sharedUtil.isBool;
var isString = sharedUtil.isString;
var isArray = sharedUtil.isArray;
var isInt = sharedUtil.isInt;
var isValidUrl = sharedUtil.isValidUrl;
var stringToBytes = sharedUtil.stringToBytes;
var stringToPDFString = sharedUtil.stringToPDFString;
var stringToUTF8String = sharedUtil.stringToUTF8String;
var warn = sharedUtil.warn;
var Dict = corePrimitives.Dict;
var isDict = corePrimitives.isDict;
var isName = corePrimitives.isName;
var Stream = coreStream.Stream;
var ColorSpace = coreColorSpace.ColorSpace;
var ObjectLoader = coreObj.ObjectLoader;
var FileSpec = coreObj.FileSpec;
var OperatorList = coreEvaluator.OperatorList;

/**
 * @class
 * @alias AnnotationFactory
 */
function AnnotationFactory() {}
AnnotationFactory.prototype = /** @lends AnnotationFactory.prototype */ {
  /**
   * @param {XRef} xref
   * @param {Object} ref
   * @returns {Annotation}
   */
  create: function AnnotationFactory_create(xref, ref) {
    var dict = xref.fetchIfRef(ref);
    if (!isDict(dict)) {
      return;
    }

    // Determine the annotation's subtype.
    var subtype = dict.get('Subtype');
    subtype = isName(subtype) ? subtype.name : '';

    // Return the right annotation object based on the subtype and field type.
    var parameters = {
      xref: xref,
      dict: dict,
      ref: ref
    };

    switch (subtype) {
      case 'Link':
        return new LinkAnnotation(parameters);

      case 'Text':
        return new TextAnnotation(parameters);

      case 'Widget':
        var fieldType = Util.getInheritableProperty(dict, 'FT');
        if (isName(fieldType) && fieldType.name === 'Tx') {
          return new TextWidgetAnnotation(parameters);
        }
        return new WidgetAnnotation(parameters);

      case 'Popup':
        return new PopupAnnotation(parameters);

      case 'Highlight':
        return new HighlightAnnotation(parameters);

      case 'Underline':
        return new UnderlineAnnotation(parameters);

      case 'Squiggly':
        return new SquigglyAnnotation(parameters);

      case 'StrikeOut':
        return new StrikeOutAnnotation(parameters);

      case 'FileAttachment':
        return new FileAttachmentAnnotation(parameters);

      default:
        warn('Unimplemented annotation type "' + subtype + '", ' +
             'falling back to base annotation');
        return new Annotation(parameters);
    }
  }
};

var Annotation = (function AnnotationClosure() {
  // 12.5.5: Algorithm: Appearance streams
  function getTransformMatrix(rect, bbox, matrix) {
    var bounds = Util.getAxialAlignedBoundingBox(bbox, matrix);
    var minX = bounds[0];
    var minY = bounds[1];
    var maxX = bounds[2];
    var maxY = bounds[3];

    if (minX === maxX || minY === maxY) {
      // From real-life file, bbox was [0, 0, 0, 0]. In this case,
      // just apply the transform for rect
      return [1, 0, 0, 1, rect[0], rect[1]];
    }

    var xRatio = (rect[2] - rect[0]) / (maxX - minX);
    var yRatio = (rect[3] - rect[1]) / (maxY - minY);
    return [
      xRatio,
      0,
      0,
      yRatio,
      rect[0] - minX * xRatio,
      rect[1] - minY * yRatio
    ];
  }

  function getDefaultAppearance(dict) {
    var appearanceState = dict.get('AP');
    if (!isDict(appearanceState)) {
      return;
    }

    var appearance;
    var appearances = appearanceState.get('N');
    if (isDict(appearances)) {
      var as = dict.get('AS');
      if (as && appearances.has(as.name)) {
        appearance = appearances.get(as.name);
      }
    } else {
      appearance = appearances;
    }
    return appearance;
  }

  function Annotation(params) {
    var dict = params.dict;

    this.setFlags(dict.get('F'));
    this.setRectangle(dict.getArray('Rect'));
    this.setColor(dict.get('C'));
    this.setBorderStyle(dict);
    this.appearance = getDefaultAppearance(dict);

    // Expose public properties using a data object.
    this.data = {};
    this.data.id = params.ref.toString();
    this.data.subtype = dict.get('Subtype').name;
    this.data.annotationFlags = this.flags;
    this.data.rect = this.rectangle;
    this.data.color = this.color;
    this.data.borderStyle = this.borderStyle;
    this.data.hasAppearance = !!this.appearance;
  }

  Annotation.prototype = {
    /**
     * @return {boolean}
     */
    get viewable() {
      if (this.flags) {
        return !this.hasFlag(AnnotationFlag.INVISIBLE) &&
               !this.hasFlag(AnnotationFlag.HIDDEN) &&
               !this.hasFlag(AnnotationFlag.NOVIEW);
      }
      return true;
    },

    /**
     * @return {boolean}
     */
    get printable() {
      if (this.flags) {
        return this.hasFlag(AnnotationFlag.PRINT) &&
               !this.hasFlag(AnnotationFlag.INVISIBLE) &&
               !this.hasFlag(AnnotationFlag.HIDDEN);
      }
      return false;
    },

    /**
     * Set the flags.
     *
     * @public
     * @memberof Annotation
     * @param {number} flags - Unsigned 32-bit integer specifying annotation
     *                         characteristics
     * @see {@link shared/util.js}
     */
    setFlags: function Annotation_setFlags(flags) {
      if (isInt(flags)) {
        this.flags = flags;
      } else {
        this.flags = 0;
      }
    },

    /**
     * Check if a provided flag is set.
     *
     * @public
     * @memberof Annotation
     * @param {number} flag - Hexadecimal representation for an annotation
     *                        characteristic
     * @return {boolean}
     * @see {@link shared/util.js}
     */
    hasFlag: function Annotation_hasFlag(flag) {
      if (this.flags) {
        return (this.flags & flag) > 0;
      }
      return false;
    },

    /**
     * Set the rectangle.
     *
     * @public
     * @memberof Annotation
     * @param {Array} rectangle - The rectangle array with exactly four entries
     */
    setRectangle: function Annotation_setRectangle(rectangle) {
      if (isArray(rectangle) && rectangle.length === 4) {
        this.rectangle = Util.normalizeRect(rectangle);
      } else {
        this.rectangle = [0, 0, 0, 0];
      }
    },

    /**
     * Set the color and take care of color space conversion.
     *
     * @public
     * @memberof Annotation
     * @param {Array} color - The color array containing either 0
     *                        (transparent), 1 (grayscale), 3 (RGB) or
     *                        4 (CMYK) elements
     */
    setColor: function Annotation_setColor(color) {
      var rgbColor = new Uint8Array(3); // Black in RGB color space (default)
      if (!isArray(color)) {
        this.color = rgbColor;
        return;
      }

      switch (color.length) {
        case 0: // Transparent, which we indicate with a null value
          this.color = null;
          break;

        case 1: // Convert grayscale to RGB
          ColorSpace.singletons.gray.getRgbItem(color, 0, rgbColor, 0);
          this.color = rgbColor;
          break;

        case 3: // Convert RGB percentages to RGB
          ColorSpace.singletons.rgb.getRgbItem(color, 0, rgbColor, 0);
          this.color = rgbColor;
          break;

        case 4: // Convert CMYK to RGB
          ColorSpace.singletons.cmyk.getRgbItem(color, 0, rgbColor, 0);
          this.color = rgbColor;
          break;

        default:
          this.color = rgbColor;
          break;
      }
    },

    /**
     * Set the border style (as AnnotationBorderStyle object).
     *
     * @public
     * @memberof Annotation
     * @param {Dict} borderStyle - The border style dictionary
     */
    setBorderStyle: function Annotation_setBorderStyle(borderStyle) {
      this.borderStyle = new AnnotationBorderStyle();
      if (!isDict(borderStyle)) {
        return;
      }
      if (borderStyle.has('BS')) {
        var dict = borderStyle.get('BS');
        var dictType;

        if (!dict.has('Type') || (isName(dictType = dict.get('Type')) &&
                                  dictType.name === 'Border')) {
          this.borderStyle.setWidth(dict.get('W'));
          this.borderStyle.setStyle(dict.get('S'));
          this.borderStyle.setDashArray(dict.get('D'));
        }
      } else if (borderStyle.has('Border')) {
        var array = borderStyle.get('Border');
        if (isArray(array) && array.length >= 3) {
          this.borderStyle.setHorizontalCornerRadius(array[0]);
          this.borderStyle.setVerticalCornerRadius(array[1]);
          this.borderStyle.setWidth(array[2]);

          if (array.length === 4) { // Dash array available
            this.borderStyle.setDashArray(array[3]);
          }
        }
      } else {
        // There are no border entries in the dictionary. According to the
        // specification, we should draw a solid border of width 1 in that
        // case, but Adobe Reader did not implement that part of the
        // specification and instead draws no border at all, so we do the same.
        // See also https://github.com/mozilla/pdf.js/issues/6179.
        this.borderStyle.setWidth(0);
      }
    },

    /**
     * Prepare the annotation for working with a popup in the display layer.
     *
     * @private
     * @memberof Annotation
     * @param {Dict} dict - The annotation's data dictionary
     */
    _preparePopup: function Annotation_preparePopup(dict) {
      if (!dict.has('C')) {
        // Fall back to the default background color.
        this.data.color = null;
      }

      this.data.hasPopup = dict.has('Popup');
      this.data.title = stringToPDFString(dict.get('T') || '');
      this.data.contents = stringToPDFString(dict.get('Contents') || '');
    },

    loadResources: function Annotation_loadResources(keys) {
      return new Promise(function (resolve, reject) {
        this.appearance.dict.getAsync('Resources').then(function (resources) {
          if (!resources) {
            resolve();
            return;
          }
          var objectLoader = new ObjectLoader(resources.map,
                                              keys,
                                              resources.xref);
          objectLoader.load().then(function() {
            resolve(resources);
          }, reject);
        }, reject);
      }.bind(this));
    },

    getOperatorList: function Annotation_getOperatorList(evaluator, task) {
      if (!this.appearance) {
        return Promise.resolve(new OperatorList());
      }

      var data = this.data;
      var appearanceDict = this.appearance.dict;
      var resourcesPromise = this.loadResources([
        'ExtGState',
        'ColorSpace',
        'Pattern',
        'Shading',
        'XObject',
        'Font'
        // ProcSet
        // Properties
      ]);
      var bbox = appearanceDict.get('BBox') || [0, 0, 1, 1];
      var matrix = appearanceDict.get('Matrix') || [1, 0, 0, 1, 0 ,0];
      var transform = getTransformMatrix(data.rect, bbox, matrix);
      var self = this;

      return resourcesPromise.then(function(resources) {
          var opList = new OperatorList();
          opList.addOp(OPS.beginAnnotation, [data.rect, transform, matrix]);
          return evaluator.getOperatorList(self.appearance, task,
                                           resources, opList).
            then(function () {
              opList.addOp(OPS.endAnnotation, []);
              self.appearance.reset();
              return opList;
            });
        });
    }
  };

  Annotation.appendToOperatorList = function Annotation_appendToOperatorList(
      annotations, opList, partialEvaluator, task, intent) {
    var annotationPromises = [];
    for (var i = 0, n = annotations.length; i < n; ++i) {
      if ((intent === 'display' && annotations[i].viewable) ||
          (intent === 'print' && annotations[i].printable)) {
        annotationPromises.push(
          annotations[i].getOperatorList(partialEvaluator, task));
      }
    }
    return Promise.all(annotationPromises).then(function(operatorLists) {
      opList.addOp(OPS.beginAnnotations, []);
      for (var i = 0, n = operatorLists.length; i < n; ++i) {
        opList.addOpList(operatorLists[i]);
      }
      opList.addOp(OPS.endAnnotations, []);
    });
  };

  return Annotation;
})();

/**
 * Contains all data regarding an annotation's border style.
 *
 * @class
 */
var AnnotationBorderStyle = (function AnnotationBorderStyleClosure() {
  /**
   * @constructor
   * @private
   */
  function AnnotationBorderStyle() {
    this.width = 1;
    this.style = AnnotationBorderStyleType.SOLID;
    this.dashArray = [3];
    this.horizontalCornerRadius = 0;
    this.verticalCornerRadius = 0;
  }

  AnnotationBorderStyle.prototype = {
    /**
     * Set the width.
     *
     * @public
     * @memberof AnnotationBorderStyle
     * @param {integer} width - The width
     */
    setWidth: function AnnotationBorderStyle_setWidth(width) {
      if (width === (width | 0)) {
        this.width = width;
      }
    },

    /**
     * Set the style.
     *
     * @public
     * @memberof AnnotationBorderStyle
     * @param {Object} style - The style object
     * @see {@link shared/util.js}
     */
    setStyle: function AnnotationBorderStyle_setStyle(style) {
      if (!style) {
        return;
      }
      switch (style.name) {
        case 'S':
          this.style = AnnotationBorderStyleType.SOLID;
          break;

        case 'D':
          this.style = AnnotationBorderStyleType.DASHED;
          break;

        case 'B':
          this.style = AnnotationBorderStyleType.BEVELED;
          break;

        case 'I':
          this.style = AnnotationBorderStyleType.INSET;
          break;

        case 'U':
          this.style = AnnotationBorderStyleType.UNDERLINE;
          break;

        default:
          break;
      }
    },

    /**
     * Set the dash array.
     *
     * @public
     * @memberof AnnotationBorderStyle
     * @param {Array} dashArray - The dash array with at least one element
     */
    setDashArray: function AnnotationBorderStyle_setDashArray(dashArray) {
      // We validate the dash array, but we do not use it because CSS does not
      // allow us to change spacing of dashes. For more information, visit
      // http://www.w3.org/TR/css3-background/#the-border-style.
      if (isArray(dashArray) && dashArray.length > 0) {
        // According to the PDF specification: the elements in a dashArray
        // shall be numbers that are nonnegative and not all equal to zero.
        var isValid = true;
        var allZeros = true;
        for (var i = 0, len = dashArray.length; i < len; i++) {
          var element = dashArray[i];
          var validNumber = (+element >= 0);
          if (!validNumber) {
            isValid = false;
            break;
          } else if (element > 0) {
            allZeros = false;
          }
        }
        if (isValid && !allZeros) {
          this.dashArray = dashArray;
        } else {
          this.width = 0; // Adobe behavior when the array is invalid.
        }
      } else if (dashArray) {
        this.width = 0; // Adobe behavior when the array is invalid.
      }
    },

    /**
     * Set the horizontal corner radius (from a Border dictionary).
     *
     * @public
     * @memberof AnnotationBorderStyle
     * @param {integer} radius - The horizontal corner radius
     */
    setHorizontalCornerRadius:
        function AnnotationBorderStyle_setHorizontalCornerRadius(radius) {
      if (radius === (radius | 0)) {
        this.horizontalCornerRadius = radius;
      }
    },

    /**
     * Set the vertical corner radius (from a Border dictionary).
     *
     * @public
     * @memberof AnnotationBorderStyle
     * @param {integer} radius - The vertical corner radius
     */
    setVerticalCornerRadius:
        function AnnotationBorderStyle_setVerticalCornerRadius(radius) {
      if (radius === (radius | 0)) {
        this.verticalCornerRadius = radius;
      }
    }
  };

  return AnnotationBorderStyle;
})();

var WidgetAnnotation = (function WidgetAnnotationClosure() {
  function WidgetAnnotation(params) {
    Annotation.call(this, params);

    var dict = params.dict;
    var data = this.data;

    data.annotationType = AnnotationType.WIDGET;
    data.fieldValue = stringToPDFString(
      Util.getInheritableProperty(dict, 'V') || '');
    data.alternativeText = stringToPDFString(dict.get('TU') || '');
    data.defaultAppearance = Util.getInheritableProperty(dict, 'DA') || '';
    var fieldType = Util.getInheritableProperty(dict, 'FT');
    data.fieldType = isName(fieldType) ? fieldType.name : '';
    data.fieldFlags = Util.getInheritableProperty(dict, 'Ff') || 0;
    this.fieldResources = Util.getInheritableProperty(dict, 'DR') || Dict.empty;

    // Hide unsupported Widget signatures.
    if (data.fieldType === 'Sig') {
      warn('unimplemented annotation type: Widget signature');
      this.setFlags(AnnotationFlag.HIDDEN);
    }

    // Building the full field name by collecting the field and
    // its ancestors 'T' data and joining them using '.'.
    var fieldName = [];
    var namedItem = dict;
    var ref = params.ref;
    while (namedItem) {
      var parent = namedItem.get('Parent');
      var parentRef = namedItem.getRaw('Parent');
      var name = namedItem.get('T');
      if (name) {
        fieldName.unshift(stringToPDFString(name));
      } else if (parent && ref) {
        // The field name is absent, that means more than one field
        // with the same name may exist. Replacing the empty name
        // with the '`' plus index in the parent's 'Kids' array.
        // This is not in the PDF spec but necessary to id the
        // the input controls.
        var kids = parent.get('Kids');
        var j, jj;
        for (j = 0, jj = kids.length; j < jj; j++) {
          var kidRef = kids[j];
          if (kidRef.num === ref.num && kidRef.gen === ref.gen) {
            break;
          }
        }
        fieldName.unshift('`' + j);
      }
      namedItem = parent;
      ref = parentRef;
    }
    data.fullName = fieldName.join('.');
  }

  Util.inherit(WidgetAnnotation, Annotation, {});

  return WidgetAnnotation;
})();

var TextWidgetAnnotation = (function TextWidgetAnnotationClosure() {
  function TextWidgetAnnotation(params) {
    WidgetAnnotation.call(this, params);

    this.data.textAlignment = Util.getInheritableProperty(params.dict, 'Q');
  }

  Util.inherit(TextWidgetAnnotation, WidgetAnnotation, {
    getOperatorList: function TextWidgetAnnotation_getOperatorList(evaluator,
                                                                   task) {
      if (this.appearance) {
        return Annotation.prototype.getOperatorList.call(this, evaluator, task);
      }

      var opList = new OperatorList();
      var data = this.data;

      // Even if there is an appearance stream, ignore it. This is the
      // behaviour used by Adobe Reader.
      if (!data.defaultAppearance) {
        return Promise.resolve(opList);
      }

      var stream = new Stream(stringToBytes(data.defaultAppearance));
      return evaluator.getOperatorList(stream, task,
                                       this.fieldResources, opList).
        then(function () {
          return opList;
        });
    }
  });

  return TextWidgetAnnotation;
})();

var TextAnnotation = (function TextAnnotationClosure() {
  var DEFAULT_ICON_SIZE = 22; // px

  function TextAnnotation(parameters) {
    Annotation.call(this, parameters);

    this.data.annotationType = AnnotationType.TEXT;

    if (this.data.hasAppearance) {
      this.data.name = 'NoIcon';
    } else {
      this.data.rect[1] = this.data.rect[3] - DEFAULT_ICON_SIZE;
      this.data.rect[2] = this.data.rect[0] + DEFAULT_ICON_SIZE;
      this.data.name = parameters.dict.has('Name') ?
                       parameters.dict.get('Name').name : 'Note';
    }
    this._preparePopup(parameters.dict);
  }

  Util.inherit(TextAnnotation, Annotation, {});

  return TextAnnotation;
})();

var LinkAnnotation = (function LinkAnnotationClosure() {
  function LinkAnnotation(params) {
    Annotation.call(this, params);

    var dict = params.dict;
    var data = this.data;
    data.annotationType = AnnotationType.LINK;

    var action = dict.get('A'), url, dest;
    if (action && isDict(action)) {
      var linkType = action.get('S').name;
      switch (linkType) {
        case 'URI':
          url = action.get('URI');
          if (isName(url)) {
            // Some bad PDFs do not put parentheses around relative URLs.
            url = '/' + url.name;
          } else if (url) {
            url = addDefaultProtocolToUrl(url);
          }
          // TODO: pdf spec mentions urls can be relative to a Base
          // entry in the dictionary.
          break;

        case 'GoTo':
          dest = action.get('D');
          break;

        case 'GoToR':
          var urlDict = action.get('F');
          if (isDict(urlDict)) {
            // We assume that we found a FileSpec dictionary
            // and fetch the URL without checking any further.
            url = urlDict.get('F') || null;
          } else if (isString(urlDict)) {
            url = urlDict;
          }

          // NOTE: the destination is relative to the *remote* document.
          var remoteDest = action.get('D');
          if (remoteDest) {
            if (isName(remoteDest)) {
              remoteDest = remoteDest.name;
            }
            if (isString(remoteDest) && isString(url)) {
              var baseUrl = url.split('#')[0];
              url = baseUrl + '#' + remoteDest;
            }
          }
          // The 'NewWindow' property, equal to `LinkTarget.BLANK`.
          var newWindow = action.get('NewWindow');
          if (isBool(newWindow)) {
            data.newWindow = newWindow;
          }
          break;

        case 'Named':
          data.action = action.get('N').name;
          break;

        default:
          warn('unrecognized link type: ' + linkType);
      }
    } else if (dict.has('Dest')) { // Simple destination link.
      dest = dict.get('Dest');
    }

    if (url) {
      if (isValidUrl(url, /* allowRelative = */ false)) {
        data.url = tryConvertUrlEncoding(url);
      }
    }
    if (dest) {
      data.dest = isName(dest) ? dest.name : dest;
    }
  }

  // Lets URLs beginning with 'www.' default to using the 'http://' protocol.
  function addDefaultProtocolToUrl(url) {
    if (isString(url) && url.indexOf('www.') === 0) {
      return ('http://' + url);
    }
    return url;
  }

  function tryConvertUrlEncoding(url) {
    // According to ISO 32000-1:2008, section 12.6.4.7, URIs should be encoded
    // in 7-bit ASCII. Some bad PDFs use UTF-8 encoding, see Bugzilla 1122280.
    try {
      return stringToUTF8String(url);
    } catch (e) {
      return url;
    }
  }

  Util.inherit(LinkAnnotation, Annotation, {});

  return LinkAnnotation;
})();

var PopupAnnotation = (function PopupAnnotationClosure() {
  function PopupAnnotation(parameters) {
    Annotation.call(this, parameters);

    this.data.annotationType = AnnotationType.POPUP;

    var dict = parameters.dict;
    var parentItem = dict.get('Parent');
    if (!parentItem) {
      warn('Popup annotation has a missing or invalid parent annotation.');
      return;
    }

    this.data.parentId = dict.getRaw('Parent').toString();
    this.data.title = stringToPDFString(parentItem.get('T') || '');
    this.data.contents = stringToPDFString(parentItem.get('Contents') || '');

    if (!parentItem.has('C')) {
      // Fall back to the default background color.
      this.data.color = null;
    } else {
      this.setColor(parentItem.get('C'));
      this.data.color = this.color;
    }
  }

  Util.inherit(PopupAnnotation, Annotation, {});

  return PopupAnnotation;
})();

var HighlightAnnotation = (function HighlightAnnotationClosure() {
  function HighlightAnnotation(parameters) {
    Annotation.call(this, parameters);

    this.data.annotationType = AnnotationType.HIGHLIGHT;
    this._preparePopup(parameters.dict);

    // PDF viewers completely ignore any border styles.
    this.data.borderStyle.setWidth(0);
  }

  Util.inherit(HighlightAnnotation, Annotation, {});

  return HighlightAnnotation;
})();

var UnderlineAnnotation = (function UnderlineAnnotationClosure() {
  function UnderlineAnnotation(parameters) {
    Annotation.call(this, parameters);

    this.data.annotationType = AnnotationType.UNDERLINE;
    this._preparePopup(parameters.dict);

    // PDF viewers completely ignore any border styles.
    this.data.borderStyle.setWidth(0);
  }

  Util.inherit(UnderlineAnnotation, Annotation, {});

  return UnderlineAnnotation;
})();

var SquigglyAnnotation = (function SquigglyAnnotationClosure() {
  function SquigglyAnnotation(parameters) {
    Annotation.call(this, parameters);

    this.data.annotationType = AnnotationType.SQUIGGLY;
    this._preparePopup(parameters.dict);

    // PDF viewers completely ignore any border styles.
    this.data.borderStyle.setWidth(0);
  }

  Util.inherit(SquigglyAnnotation, Annotation, {});

  return SquigglyAnnotation;
})();

var StrikeOutAnnotation = (function StrikeOutAnnotationClosure() {
  function StrikeOutAnnotation(parameters) {
    Annotation.call(this, parameters);

    this.data.annotationType = AnnotationType.STRIKEOUT;
    this._preparePopup(parameters.dict);

    // PDF viewers completely ignore any border styles.
    this.data.borderStyle.setWidth(0);
  }

  Util.inherit(StrikeOutAnnotation, Annotation, {});

  return StrikeOutAnnotation;
})();

var FileAttachmentAnnotation = (function FileAttachmentAnnotationClosure() {
  function FileAttachmentAnnotation(parameters) {
    Annotation.call(this, parameters);

    var file = new FileSpec(parameters.dict.get('FS'), parameters.xref);

    this.data.annotationType = AnnotationType.FILEATTACHMENT;
    this.data.file = file.serializable;
    this._preparePopup(parameters.dict);
  }

  Util.inherit(FileAttachmentAnnotation, Annotation, {});

  return FileAttachmentAnnotation;
})();

exports.Annotation = Annotation;
exports.AnnotationBorderStyle = AnnotationBorderStyle;
exports.AnnotationFactory = AnnotationFactory;
}));


(function (root, factory) {
  {
    factory((root.pdfjsCoreDocument = {}), root.pdfjsSharedUtil,
      root.pdfjsCorePrimitives, root.pdfjsCoreStream,
      root.pdfjsCoreObj, root.pdfjsCoreParser, root.pdfjsCoreCrypto,
      root.pdfjsCoreEvaluator, root.pdfjsCoreAnnotation);
  }
}(this, function (exports, sharedUtil, corePrimitives, coreStream, coreObj,
                  coreParser, coreCrypto, coreEvaluator, coreAnnotation) {

var MissingDataException = sharedUtil.MissingDataException;
var Util = sharedUtil.Util;
var assert = sharedUtil.assert;
var error = sharedUtil.error;
var info = sharedUtil.info;
var isArray = sharedUtil.isArray;
var isArrayBuffer = sharedUtil.isArrayBuffer;
var isString = sharedUtil.isString;
var shadow = sharedUtil.shadow;
var stringToBytes = sharedUtil.stringToBytes;
var stringToPDFString = sharedUtil.stringToPDFString;
var warn = sharedUtil.warn;
var Dict = corePrimitives.Dict;
var isDict = corePrimitives.isDict;
var isName = corePrimitives.isName;
var isStream = corePrimitives.isStream;
var NullStream = coreStream.NullStream;
var Stream = coreStream.Stream;
var StreamsSequenceStream = coreStream.StreamsSequenceStream;
var Catalog = coreObj.Catalog;
var ObjectLoader = coreObj.ObjectLoader;
var XRef = coreObj.XRef;
var Lexer = coreParser.Lexer;
var Linearization = coreParser.Linearization;
var calculateMD5 = coreCrypto.calculateMD5;
var OperatorList = coreEvaluator.OperatorList;
var PartialEvaluator = coreEvaluator.PartialEvaluator;
var Annotation = coreAnnotation.Annotation;
var AnnotationFactory = coreAnnotation.AnnotationFactory;

var Page = (function PageClosure() {

  var LETTER_SIZE_MEDIABOX = [0, 0, 612, 792];

  function Page(pdfManager, xref, pageIndex, pageDict, ref, fontCache) {
    this.pdfManager = pdfManager;
    this.pageIndex = pageIndex;
    this.pageDict = pageDict;
    this.xref = xref;
    this.ref = ref;
    this.fontCache = fontCache;
    this.idCounters = {
      obj: 0
    };
    this.evaluatorOptions = pdfManager.evaluatorOptions;
    this.resourcesPromise = null;
  }

  Page.prototype = {
    getPageProp: function Page_getPageProp(key) {
      return this.pageDict.get(key);
    },

    getInheritedPageProp: function Page_getInheritedPageProp(key) {
      var dict = this.pageDict, valueArray = null, loopCount = 0;
      var MAX_LOOP_COUNT = 100;
      // Always walk up the entire parent chain, to be able to find
      // e.g. \Resources placed on multiple levels of the tree.
      while (dict) {
        var value = dict.get(key);
        if (value) {
          if (!valueArray) {
            valueArray = [];
          }
          valueArray.push(value);
        }
        if (++loopCount > MAX_LOOP_COUNT) {
          warn('Page_getInheritedPageProp: maximum loop count exceeded.');
          break;
        }
        dict = dict.get('Parent');
      }
      if (!valueArray) {
        return Dict.empty;
      }
      if (valueArray.length === 1 || !isDict(valueArray[0]) ||
          loopCount > MAX_LOOP_COUNT) {
        return valueArray[0];
      }
      return Dict.merge(this.xref, valueArray);
    },

    get content() {
      return this.getPageProp('Contents');
    },

    get resources() {
      // For robustness: The spec states that a \Resources entry has to be
      // present, but can be empty. Some document omit it still, in this case
      // we return an empty dictionary.
      return shadow(this, 'resources', this.getInheritedPageProp('Resources'));
    },

    get mediaBox() {
      var obj = this.getInheritedPageProp('MediaBox');
      // Reset invalid media box to letter size.
      if (!isArray(obj) || obj.length !== 4) {
        obj = LETTER_SIZE_MEDIABOX;
      }
      return shadow(this, 'mediaBox', obj);
    },

    get view() {
      var mediaBox = this.mediaBox;
      var cropBox = this.getInheritedPageProp('CropBox');
      if (!isArray(cropBox) || cropBox.length !== 4) {
        return shadow(this, 'view', mediaBox);
      }

      // From the spec, 6th ed., p.963:
      // "The crop, bleed, trim, and art boxes should not ordinarily
      // extend beyond the boundaries of the media box. If they do, they are
      // effectively reduced to their intersection with the media box."
      cropBox = Util.intersect(cropBox, mediaBox);
      if (!cropBox) {
        return shadow(this, 'view', mediaBox);
      }
      return shadow(this, 'view', cropBox);
    },

    get rotate() {
      var rotate = this.getInheritedPageProp('Rotate') || 0;
      // Normalize rotation so it's a multiple of 90 and between 0 and 270
      if (rotate % 90 !== 0) {
        rotate = 0;
      } else if (rotate >= 360) {
        rotate = rotate % 360;
      } else if (rotate < 0) {
        // The spec doesn't cover negatives, assume its counterclockwise
        // rotation. The following is the other implementation of modulo.
        rotate = ((rotate % 360) + 360) % 360;
      }
      return shadow(this, 'rotate', rotate);
    },

    getContentStream: function Page_getContentStream() {
      var content = this.content;
      var stream;
      if (isArray(content)) {
        // fetching items
        var xref = this.xref;
        var i, n = content.length;
        var streams = [];
        for (i = 0; i < n; ++i) {
          streams.push(xref.fetchIfRef(content[i]));
        }
        stream = new StreamsSequenceStream(streams);
      } else if (isStream(content)) {
        stream = content;
      } else {
        // replacing non-existent page content with empty one
        stream = new NullStream();
      }
      return stream;
    },

    loadResources: function Page_loadResources(keys) {
      if (!this.resourcesPromise) {
        // TODO: add async getInheritedPageProp and remove this.
        this.resourcesPromise = this.pdfManager.ensure(this, 'resources');
      }
      return this.resourcesPromise.then(function resourceSuccess() {
        var objectLoader = new ObjectLoader(this.resources.map,
                                            keys,
                                            this.xref);
        return objectLoader.load();
      }.bind(this));
    },

    getOperatorList: function Page_getOperatorList(handler, task, intent) {
      var self = this;

      var pdfManager = this.pdfManager;
      var contentStreamPromise = pdfManager.ensure(this, 'getContentStream',
                                                   []);
      var resourcesPromise = this.loadResources([
        'ExtGState',
        'ColorSpace',
        'Pattern',
        'Shading',
        'XObject',
        'Font'
        // ProcSet
        // Properties
      ]);

      var partialEvaluator = new PartialEvaluator(pdfManager, this.xref,
                                                  handler, this.pageIndex,
                                                  'p' + this.pageIndex + '_',
                                                  this.idCounters,
                                                  this.fontCache,
                                                  this.evaluatorOptions);

      var dataPromises = Promise.all([contentStreamPromise, resourcesPromise]);
      var pageListPromise = dataPromises.then(function(data) {
        var contentStream = data[0];
        var opList = new OperatorList(intent, handler, self.pageIndex);

        handler.send('StartRenderPage', {
          transparency: partialEvaluator.hasBlendModes(self.resources),
          pageIndex: self.pageIndex,
          intent: intent
        });
        return partialEvaluator.getOperatorList(contentStream, task,
          self.resources, opList).then(function () {
            return opList;
          });
      });

      var annotationsPromise = pdfManager.ensure(this, 'annotations');
      return Promise.all([pageListPromise, annotationsPromise]).then(
          function(datas) {
        var pageOpList = datas[0];
        var annotations = datas[1];

        if (annotations.length === 0) {
          pageOpList.flush(true);
          return pageOpList;
        }

        var annotationsReadyPromise = Annotation.appendToOperatorList(
          annotations, pageOpList, partialEvaluator, task, intent);
        return annotationsReadyPromise.then(function () {
          pageOpList.flush(true);
          return pageOpList;
        });
      });
    },

    extractTextContent: function Page_extractTextContent(task,
                                                         normalizeWhitespace) {
      var handler = {
        on: function nullHandlerOn() {},
        send: function nullHandlerSend() {}
      };

      var self = this;

      var pdfManager = this.pdfManager;
      var contentStreamPromise = pdfManager.ensure(this, 'getContentStream',
                                                   []);

      var resourcesPromise = this.loadResources([
        'ExtGState',
        'XObject',
        'Font'
      ]);

      var dataPromises = Promise.all([contentStreamPromise,
                                      resourcesPromise]);
      return dataPromises.then(function(data) {
        var contentStream = data[0];
        var partialEvaluator = new PartialEvaluator(pdfManager, self.xref,
                                                    handler, self.pageIndex,
                                                    'p' + self.pageIndex + '_',
                                                    self.idCounters,
                                                    self.fontCache,
                                                    self.evaluatorOptions);

        return partialEvaluator.getTextContent(contentStream,
                                               task,
                                               self.resources,
                                               /* stateManager = */ null,
                                               normalizeWhitespace);
      });
    },

    getAnnotationsData: function Page_getAnnotationsData(intent) {
      var annotations = this.annotations;
      var annotationsData = [];
      for (var i = 0, n = annotations.length; i < n; ++i) {
        if (intent) {
          if (!(intent === 'display' && annotations[i].viewable) &&
              !(intent === 'print' && annotations[i].printable)) {
            continue;
          }
        }
        annotationsData.push(annotations[i].data);
      }
      return annotationsData;
    },

    get annotations() {
      var annotations = [];
      var annotationRefs = this.getInheritedPageProp('Annots') || [];
      var annotationFactory = new AnnotationFactory();
      for (var i = 0, n = annotationRefs.length; i < n; ++i) {
        var annotationRef = annotationRefs[i];
        var annotation = annotationFactory.create(this.xref, annotationRef);
        if (annotation) {
          annotations.push(annotation);
        }
      }
      return shadow(this, 'annotations', annotations);
    }
  };

  return Page;
})();

/**
 * The `PDFDocument` holds all the data of the PDF file. Compared to the
 * `PDFDoc`, this one doesn't have any job management code.
 * Right now there exists one PDFDocument on the main thread + one object
 * for each worker. If there is no worker support enabled, there are two
 * `PDFDocument` objects on the main thread created.
 */
var PDFDocument = (function PDFDocumentClosure() {
  var FINGERPRINT_FIRST_BYTES = 1024;
  var EMPTY_FINGERPRINT = '\x00\x00\x00\x00\x00\x00\x00' +
    '\x00\x00\x00\x00\x00\x00\x00\x00\x00';

  function PDFDocument(pdfManager, arg, password) {
    if (isStream(arg)) {
      init.call(this, pdfManager, arg, password);
    } else if (isArrayBuffer(arg)) {
      init.call(this, pdfManager, new Stream(arg), password);
    } else {
      error('PDFDocument: Unknown argument type');
    }
  }

  function init(pdfManager, stream, password) {
    assert(stream.length > 0, 'stream must have data');
    this.pdfManager = pdfManager;
    this.stream = stream;
    var xref = new XRef(this.stream, password, pdfManager);
    this.xref = xref;
  }

  function find(stream, needle, limit, backwards) {
    var pos = stream.pos;
    var end = stream.end;
    var strBuf = [];
    if (pos + limit > end) {
      limit = end - pos;
    }
    for (var n = 0; n < limit; ++n) {
      strBuf.push(String.fromCharCode(stream.getByte()));
    }
    var str = strBuf.join('');
    stream.pos = pos;
    var index = backwards ? str.lastIndexOf(needle) : str.indexOf(needle);
    if (index === -1) {
      return false; /* not found */
    }
    stream.pos += index;
    return true; /* found */
  }

  var DocumentInfoValidators = {
    get entries() {
      // Lazily build this since all the validation functions below are not
      // defined until after this file loads.
      return shadow(this, 'entries', {
        Title: isString,
        Author: isString,
        Subject: isString,
        Keywords: isString,
        Creator: isString,
        Producer: isString,
        CreationDate: isString,
        ModDate: isString,
        Trapped: isName
      });
    }
  };

  PDFDocument.prototype = {
    parse: function PDFDocument_parse(recoveryMode) {
      this.setup(recoveryMode);
      var version = this.catalog.catDict.get('Version');
      if (isName(version)) {
        this.pdfFormatVersion = version.name;
      }
      try {
        // checking if AcroForm is present
        this.acroForm = this.catalog.catDict.get('AcroForm');
        if (this.acroForm) {
          this.xfa = this.acroForm.get('XFA');
          var fields = this.acroForm.get('Fields');
          if ((!fields || !isArray(fields) || fields.length === 0) &&
              !this.xfa) {
            // no fields and no XFA -- not a form (?)
            this.acroForm = null;
          }
        }
      } catch (ex) {
        info('Something wrong with AcroForm entry');
        this.acroForm = null;
      }
    },

    get linearization() {
      var linearization = null;
      if (this.stream.length) {
        try {
          linearization = Linearization.create(this.stream);
        } catch (err) {
          if (err instanceof MissingDataException) {
            throw err;
          }
          info(err);
        }
      }
      // shadow the prototype getter with a data property
      return shadow(this, 'linearization', linearization);
    },
    get startXRef() {
      var stream = this.stream;
      var startXRef = 0;
      var linearization = this.linearization;
      if (linearization) {
        // Find end of first obj.
        stream.reset();
        if (find(stream, 'endobj', 1024)) {
          startXRef = stream.pos + 6;
        }
      } else {
        // Find startxref by jumping backward from the end of the file.
        var step = 1024;
        var found = false, pos = stream.end;
        while (!found && pos > 0) {
          pos -= step - 'startxref'.length;
          if (pos < 0) {
            pos = 0;
          }
          stream.pos = pos;
          found = find(stream, 'startxref', step, true);
        }
        if (found) {
          stream.skip(9);
          var ch;
          do {
            ch = stream.getByte();
          } while (Lexer.isSpace(ch));
          var str = '';
          while (ch >= 0x20 && ch <= 0x39) { // < '9'
            str += String.fromCharCode(ch);
            ch = stream.getByte();
          }
          startXRef = parseInt(str, 10);
          if (isNaN(startXRef)) {
            startXRef = 0;
          }
        }
      }
      // shadow the prototype getter with a data property
      return shadow(this, 'startXRef', startXRef);
    },
    get mainXRefEntriesOffset() {
      var mainXRefEntriesOffset = 0;
      var linearization = this.linearization;
      if (linearization) {
        mainXRefEntriesOffset = linearization.mainXRefEntriesOffset;
      }
      // shadow the prototype getter with a data property
      return shadow(this, 'mainXRefEntriesOffset', mainXRefEntriesOffset);
    },
    // Find the header, remove leading garbage and setup the stream
    // starting from the header.
    checkHeader: function PDFDocument_checkHeader() {
      var stream = this.stream;
      stream.reset();
      if (find(stream, '%PDF-', 1024)) {
        // Found the header, trim off any garbage before it.
        stream.moveStart();
        // Reading file format version
        var MAX_VERSION_LENGTH = 12;
        var version = '', ch;
        while ((ch = stream.getByte()) > 0x20) { // SPACE
          if (version.length >= MAX_VERSION_LENGTH) {
            break;
          }
          version += String.fromCharCode(ch);
        }
        if (!this.pdfFormatVersion) {
          // removing "%PDF-"-prefix
          this.pdfFormatVersion = version.substring(5);
        }
        return;
      }
      // May not be a PDF file, continue anyway.
    },
    parseStartXRef: function PDFDocument_parseStartXRef() {
      var startXRef = this.startXRef;
      this.xref.setStartXRef(startXRef);
    },
    setup: function PDFDocument_setup(recoveryMode) {
      this.xref.parse(recoveryMode);
      var self = this;
      var pageFactory = {
        createPage: function (pageIndex, dict, ref, fontCache) {
          return new Page(self.pdfManager, self.xref, pageIndex, dict, ref,
                          fontCache);
        }
      };
      this.catalog = new Catalog(this.pdfManager, this.xref, pageFactory);
    },
    get numPages() {
      var linearization = this.linearization;
      var num = linearization ? linearization.numPages : this.catalog.numPages;
      // shadow the prototype getter
      return shadow(this, 'numPages', num);
    },
    get documentInfo() {
      var docInfo = {
        PDFFormatVersion: this.pdfFormatVersion,
        IsAcroFormPresent: !!this.acroForm,
        IsXFAPresent: !!this.xfa
      };
      var infoDict;
      try {
        infoDict = this.xref.trailer.get('Info');
      } catch (err) {
        info('The document information dictionary is invalid.');
      }
      if (infoDict) {
        var validEntries = DocumentInfoValidators.entries;
        // Only fill the document info with valid entries from the spec.
        for (var key in validEntries) {
          if (infoDict.has(key)) {
            var value = infoDict.get(key);
            // Make sure the value conforms to the spec.
            if (validEntries[key](value)) {
              docInfo[key] = (typeof value !== 'string' ?
                              value : stringToPDFString(value));
            } else {
              info('Bad value in document info for "' + key + '"');
            }
          }
        }
      }
      return shadow(this, 'documentInfo', docInfo);
    },
    get fingerprint() {
      var xref = this.xref, hash, fileID = '';
      var idArray = xref.trailer.get('ID');

      if (idArray && isArray(idArray) && idArray[0] && isString(idArray[0]) &&
          idArray[0] !== EMPTY_FINGERPRINT) {
        hash = stringToBytes(idArray[0]);
      } else {
        if (this.stream.ensureRange) {
          this.stream.ensureRange(0,
            Math.min(FINGERPRINT_FIRST_BYTES, this.stream.end));
        }
        hash = calculateMD5(this.stream.bytes.subarray(0,
          FINGERPRINT_FIRST_BYTES), 0, FINGERPRINT_FIRST_BYTES);
      }

      for (var i = 0, n = hash.length; i < n; i++) {
        var hex = hash[i].toString(16);
        fileID += hex.length === 1 ? '0' + hex : hex;
      }

      return shadow(this, 'fingerprint', fileID);
    },

    getPage: function PDFDocument_getPage(pageIndex) {
      return this.catalog.getPage(pageIndex);
    },

    cleanup: function PDFDocument_cleanup() {
      return this.catalog.cleanup();
    }
  };

  return PDFDocument;
})();

exports.Page = Page;
exports.PDFDocument = PDFDocument;
}));


(function (root, factory) {
  {
    factory((root.pdfjsCorePdfManager = {}), root.pdfjsSharedUtil,
      root.pdfjsCoreStream, root.pdfjsCoreChunkedStream,
      root.pdfjsCoreDocument);
  }
}(this, function (exports, sharedUtil, coreStream, coreChunkedStream,
                  coreDocument) {

var NotImplementedException = sharedUtil.NotImplementedException;
var MissingDataException = sharedUtil.MissingDataException;
var createPromiseCapability = sharedUtil.createPromiseCapability;
var Util = sharedUtil.Util;
var Stream = coreStream.Stream;
var ChunkedStreamManager = coreChunkedStream.ChunkedStreamManager;
var PDFDocument = coreDocument.PDFDocument;

var BasePdfManager = (function BasePdfManagerClosure() {
  function BasePdfManager() {
    throw new Error('Cannot initialize BaseManagerManager');
  }

  BasePdfManager.prototype = {
    get docId() {
      return this._docId;
    },

    onLoadedStream: function BasePdfManager_onLoadedStream() {
      throw new NotImplementedException();
    },

    ensureDoc: function BasePdfManager_ensureDoc(prop, args) {
      return this.ensure(this.pdfDocument, prop, args);
    },

    ensureXRef: function BasePdfManager_ensureXRef(prop, args) {
      return this.ensure(this.pdfDocument.xref, prop, args);
    },

    ensureCatalog: function BasePdfManager_ensureCatalog(prop, args) {
      return this.ensure(this.pdfDocument.catalog, prop, args);
    },

    getPage: function BasePdfManager_getPage(pageIndex) {
      return this.pdfDocument.getPage(pageIndex);
    },

    cleanup: function BasePdfManager_cleanup() {
      return this.pdfDocument.cleanup();
    },

    ensure: function BasePdfManager_ensure(obj, prop, args) {
      return new NotImplementedException();
    },

    requestRange: function BasePdfManager_requestRange(begin, end) {
      return new NotImplementedException();
    },

    requestLoadedStream: function BasePdfManager_requestLoadedStream() {
      return new NotImplementedException();
    },

    sendProgressiveData: function BasePdfManager_sendProgressiveData(chunk) {
      return new NotImplementedException();
    },

    updatePassword: function BasePdfManager_updatePassword(password) {
      this.pdfDocument.xref.password = this.password = password;
      if (this._passwordChangedCapability) {
        this._passwordChangedCapability.resolve();
      }
    },

    passwordChanged: function BasePdfManager_passwordChanged() {
      this._passwordChangedCapability = createPromiseCapability();
      return this._passwordChangedCapability.promise;
    },

    terminate: function BasePdfManager_terminate() {
      return new NotImplementedException();
    }
  };

  return BasePdfManager;
})();

var LocalPdfManager = (function LocalPdfManagerClosure() {
  function LocalPdfManager(docId, data, password, evaluatorOptions) {
    this._docId = docId;
    this.evaluatorOptions = evaluatorOptions;
    var stream = new Stream(data);
    this.pdfDocument = new PDFDocument(this, stream, password);
    this._loadedStreamCapability = createPromiseCapability();
    this._loadedStreamCapability.resolve(stream);
  }

  Util.inherit(LocalPdfManager, BasePdfManager, {
    ensure: function LocalPdfManager_ensure(obj, prop, args) {
      return new Promise(function (resolve, reject) {
        try {
          var value = obj[prop];
          var result;
          if (typeof value === 'function') {
            result = value.apply(obj, args);
          } else {
            result = value;
          }
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    },

    requestRange: function LocalPdfManager_requestRange(begin, end) {
      return Promise.resolve();
    },

    requestLoadedStream: function LocalPdfManager_requestLoadedStream() {
      return;
    },

    onLoadedStream: function LocalPdfManager_onLoadedStream() {
      return this._loadedStreamCapability.promise;
    },

    terminate: function LocalPdfManager_terminate() {
      return;
    }
  });

  return LocalPdfManager;
})();

var NetworkPdfManager = (function NetworkPdfManagerClosure() {
  function NetworkPdfManager(docId, pdfNetworkStream, args, evaluatorOptions) {
    this._docId = docId;
    this.msgHandler = args.msgHandler;
    this.evaluatorOptions = evaluatorOptions;

    var params = {
      msgHandler: args.msgHandler,
      url: args.url,
      length: args.length,
      disableAutoFetch: args.disableAutoFetch,
      rangeChunkSize: args.rangeChunkSize
    };
    this.streamManager = new ChunkedStreamManager(pdfNetworkStream, params);
    this.pdfDocument = new PDFDocument(this, this.streamManager.getStream(),
                                       args.password);
  }

  Util.inherit(NetworkPdfManager, BasePdfManager, {
    ensure: function NetworkPdfManager_ensure(obj, prop, args) {
      var pdfManager = this;

      return new Promise(function (resolve, reject) {
        function ensureHelper() {
          try {
            var result;
            var value = obj[prop];
            if (typeof value === 'function') {
              result = value.apply(obj, args);
            } else {
              result = value;
            }
            resolve(result);
          } catch(e) {
            if (!(e instanceof MissingDataException)) {
              reject(e);
              return;
            }
            pdfManager.streamManager.requestRange(e.begin, e.end).
              then(ensureHelper, reject);
          }
        }

        ensureHelper();
      });
    },

    requestRange: function NetworkPdfManager_requestRange(begin, end) {
      return this.streamManager.requestRange(begin, end);
    },

    requestLoadedStream: function NetworkPdfManager_requestLoadedStream() {
      this.streamManager.requestAllChunks();
    },

    sendProgressiveData:
        function NetworkPdfManager_sendProgressiveData(chunk) {
      this.streamManager.onReceiveData({ chunk: chunk });
    },

    onLoadedStream: function NetworkPdfManager_onLoadedStream() {
      return this.streamManager.onLoadedStream();
    },

    terminate: function NetworkPdfManager_terminate() {
      this.streamManager.abort();
    }
  });

  return NetworkPdfManager;
})();

exports.LocalPdfManager = LocalPdfManager;
exports.NetworkPdfManager = NetworkPdfManager;
}));


(function (root, factory) {
  {
    factory((root.pdfjsCoreWorker = {}), root.pdfjsSharedUtil,
      root.pdfjsCorePrimitives, root.pdfjsCorePdfManager);
  }
}(this, function (exports, sharedUtil, corePrimitives, corePdfManager) {

var UNSUPPORTED_FEATURES = sharedUtil.UNSUPPORTED_FEATURES;
var InvalidPDFException = sharedUtil.InvalidPDFException;
var MessageHandler = sharedUtil.MessageHandler;
var MissingPDFException = sharedUtil.MissingPDFException;
var UnexpectedResponseException = sharedUtil.UnexpectedResponseException;
var PasswordException = sharedUtil.PasswordException;
var PasswordResponses = sharedUtil.PasswordResponses;
var UnknownErrorException = sharedUtil.UnknownErrorException;
var XRefParseException = sharedUtil.XRefParseException;
var arrayByteLength = sharedUtil.arrayByteLength;
var arraysToBytes = sharedUtil.arraysToBytes;
var assert = sharedUtil.assert;
var createPromiseCapability = sharedUtil.createPromiseCapability;
var error = sharedUtil.error;
var info = sharedUtil.info;
var warn = sharedUtil.warn;
var setVerbosityLevel = sharedUtil.setVerbosityLevel;
var Ref = corePrimitives.Ref;
var LocalPdfManager = corePdfManager.LocalPdfManager;
var NetworkPdfManager = corePdfManager.NetworkPdfManager;
var globalScope = sharedUtil.globalScope;

var WorkerTask = (function WorkerTaskClosure() {
  function WorkerTask(name) {
    this.name = name;
    this.terminated = false;
    this._capability = createPromiseCapability();
  }

  WorkerTask.prototype = {
    get finished() {
      return this._capability.promise;
    },

    finish: function () {
      this._capability.resolve();
    },

    terminate: function () {
      this.terminated = true;
    },

    ensureNotTerminated: function () {
      if (this.terminated) {
        throw new Error('Worker task was terminated');
      }
    }
  };

  return WorkerTask;
})();


/** @implements {IPDFStream} */
var PDFWorkerStream = (function PDFWorkerStreamClosure() {
  function PDFWorkerStream(params, msgHandler) {
    this._queuedChunks = [];
    var initialData = params.initialData;
    if (initialData && initialData.length > 0) {
      this._queuedChunks.push(initialData);
    }
    this._msgHandler = msgHandler;

    this._isRangeSupported = !(params.disableRange);
    this._isStreamingSupported = !(params.disableStream);
    this._contentLength = params.length;

    this._fullRequestReader = null;
    this._rangeReaders = [];

    msgHandler.on('OnDataRange', this._onReceiveData.bind(this));
    msgHandler.on('OnDataProgress', this._onProgress.bind(this));
  }
  PDFWorkerStream.prototype = {
    _onReceiveData: function PDFWorkerStream_onReceiveData(args) {
       if (args.begin === undefined) {
         if (this._fullRequestReader) {
           this._fullRequestReader._enqueue(args.chunk);
         } else {
           this._queuedChunks.push(args.chunk);
         }
       } else {
         var found = this._rangeReaders.some(function (rangeReader) {
           if (rangeReader._begin !== args.begin) {
             return false;
           }
           rangeReader._enqueue(args.chunk);
           return true;
         });
         assert(found);
       }
    },

    _onProgress: function PDFWorkerStream_onProgress(evt) {
       if (this._rangeReaders.length > 0) {
         // Reporting to first range reader.
         var firstReader = this._rangeReaders[0];
         if (firstReader.onProgress) {
           firstReader.onProgress({loaded: evt.loaded});
         }
       }
    },

    _removeRangeReader: function PDFWorkerStream_removeRangeReader(reader) {
      var i = this._rangeReaders.indexOf(reader);
      if (i >= 0) {
        this._rangeReaders.splice(i, 1);
      }
    },

    getFullReader: function PDFWorkerStream_getFullReader() {
      assert(!this._fullRequestReader);
      var queuedChunks = this._queuedChunks;
      this._queuedChunks = null;
      return new PDFWorkerStreamReader(this, queuedChunks);
    },

    getRangeReader: function PDFWorkerStream_getRangeReader(begin, end) {
      var reader = new PDFWorkerStreamRangeReader(this, begin, end);
      this._msgHandler.send('RequestDataRange', { begin: begin, end: end });
      this._rangeReaders.push(reader);
      return reader;
    },

    cancelAllRequests: function PDFWorkerStream_cancelAllRequests(reason) {
      if (this._fullRequestReader) {
        this._fullRequestReader.cancel(reason);
      }
      var readers = this._rangeReaders.slice(0);
      readers.forEach(function (rangeReader) {
        rangeReader.cancel(reason);
      });
    }
  };

  /** @implements {IPDFStreamReader} */
  function PDFWorkerStreamReader(stream, queuedChunks) {
    this._stream = stream;
    this._done = false;
    this._queuedChunks = queuedChunks || [];
    this._requests = [];
    this._headersReady = Promise.resolve();
    stream._fullRequestReader = this;

    this.onProgress = null; // not used
  }
  PDFWorkerStreamReader.prototype = {
    _enqueue: function PDFWorkerStreamReader_enqueue(chunk) {
      if (this._done) {
        return; // ignore new data
      }
      if (this._requests.length > 0) {
        var requestCapability = this._requests.shift();
        requestCapability.resolve({value: chunk, done: false});
        return;
      }
      this._queuedChunks.push(chunk);
    },

    get headersReady() {
      return this._headersReady;
    },

    get isRangeSupported() {
      return this._stream._isRangeSupported;
    },

    get isStreamingSupported() {
      return this._stream._isStreamingSupported;
    },

    get contentLength() {
      return this._stream._contentLength;
    },

    read: function PDFWorkerStreamReader_read() {
      if (this._queuedChunks.length > 0) {
        var chunk = this._queuedChunks.shift();
        return Promise.resolve({value: chunk, done: false});
      }
      if (this._done) {
        return Promise.resolve({value: undefined, done: true});
      }
      var requestCapability = createPromiseCapability();
      this._requests.push(requestCapability);
      return requestCapability.promise;
    },

    cancel: function PDFWorkerStreamReader_cancel(reason) {
      this._done = true;
      this._requests.forEach(function (requestCapability) {
        requestCapability.resolve({value: undefined, done: true});
      });
      this._requests = [];
    }
  };

  /** @implements {IPDFStreamRangeReader} */
  function PDFWorkerStreamRangeReader(stream, begin, end) {
    this._stream = stream;
    this._begin = begin;
    this._end = end;
    this._queuedChunk = null;
    this._requests = [];
    this._done = false;

    this.onProgress = null;
  }
  PDFWorkerStreamRangeReader.prototype = {
    _enqueue: function PDFWorkerStreamRangeReader_enqueue(chunk) {
      if (this._done) {
        return; // ignore new data
      }
      if (this._requests.length === 0) {
        this._queuedChunk = chunk;
      } else {
        var requestsCapability = this._requests.shift();
        requestsCapability.resolve({value: chunk, done: false});
        this._requests.forEach(function (requestCapability) {
          requestCapability.resolve({value: undefined, done: true});
        });
        this._requests = [];
      }
      this._done = true;
      this._stream._removeRangeReader(this);
    },

    get isStreamingSupported() {
      return false;
    },

    read: function PDFWorkerStreamRangeReader_read() {
      if (this._queuedChunk) {
        return Promise.resolve({value: this._queuedChunk, done: false});
      }
      if (this._done) {
        return Promise.resolve({value: undefined, done: true});
      }
      var requestCapability = createPromiseCapability();
      this._requests.push(requestCapability);
      return requestCapability.promise;
    },

    cancel: function PDFWorkerStreamRangeReader_cancel(reason) {
      this._done = true;
      this._requests.forEach(function (requestCapability) {
        requestCapability.resolve({value: undefined, done: true});
      });
      this._requests = [];
      this._stream._removeRangeReader(this);
    }
  };

  return PDFWorkerStream;
})();

/** @type IPDFStream */
var PDFNetworkStream;

/**
 * Sets PDFNetworkStream class to be used as alternative PDF data transport.
 * @param {IPDFStream} cls - the PDF data transport.
 */
function setPDFNetworkStreamClass(cls) {
  PDFNetworkStream = cls;
}

var WorkerMessageHandler = {
  setup: function wphSetup(handler, port) {
    var testMessageProcessed = false;
    handler.on('test', function wphSetupTest(data) {
      if (testMessageProcessed) {
        return; // we already processed 'test' message once
      }
      testMessageProcessed = true;

      // check if Uint8Array can be sent to worker
      if (!(data instanceof Uint8Array)) {
        handler.send('test', 'main', false);
        return;
      }
      // making sure postMessage transfers are working
      var supportTransfers = data[0] === 255;
      handler.postMessageTransfers = supportTransfers;
      // check if the response property is supported by xhr
      var xhr = new XMLHttpRequest();
      var responseExists = 'response' in xhr;
      // check if the property is actually implemented
      try {
        var dummy = xhr.responseType;
      } catch (e) {
        responseExists = false;
      }
      if (!responseExists) {
        handler.send('test', false);
        return;
      }
      handler.send('test', {
        supportTypedArray: true,
        supportTransfers: supportTransfers
      });
    });

    handler.on('configure', function wphConfigure(data) {
      setVerbosityLevel(data.verbosity);
    });

    handler.on('GetDocRequest', function wphSetupDoc(data) {
      return WorkerMessageHandler.createDocumentHandler(data, port);
    });
  },
  createDocumentHandler: function wphCreateDocumentHandler(docParams, port) {
    // This context is actually holds references on pdfManager and handler,
    // until the latter is destroyed.
    var pdfManager;
    var terminated = false;
    var cancelXHRs = null;
    var WorkerTasks = [];

    var docId = docParams.docId;
    var workerHandlerName = docParams.docId + '_worker';
    var handler = new MessageHandler(workerHandlerName, docId, port);

    // Ensure that postMessage transfers are correctly enabled/disabled,
    // to prevent "DataCloneError" in older versions of IE (see issue 6957).
    handler.postMessageTransfers = docParams.postMessageTransfers;

    function ensureNotTerminated() {
      if (terminated) {
        throw new Error('Worker was terminated');
      }
    }

    function startWorkerTask(task) {
      WorkerTasks.push(task);
    }

    function finishWorkerTask(task) {
      task.finish();
      var i = WorkerTasks.indexOf(task);
      WorkerTasks.splice(i, 1);
    }

    function loadDocument(recoveryMode) {
      var loadDocumentCapability = createPromiseCapability();

      var parseSuccess = function parseSuccess() {
        var numPagesPromise = pdfManager.ensureDoc('numPages');
        var fingerprintPromise = pdfManager.ensureDoc('fingerprint');
        var encryptedPromise = pdfManager.ensureXRef('encrypt');
        Promise.all([numPagesPromise, fingerprintPromise,
                     encryptedPromise]).then(function onDocReady(results) {
          var doc = {
            numPages: results[0],
            fingerprint: results[1],
            encrypted: !!results[2],
          };
          loadDocumentCapability.resolve(doc);
        },
        parseFailure);
      };

      var parseFailure = function parseFailure(e) {
        loadDocumentCapability.reject(e);
      };

      pdfManager.ensureDoc('checkHeader', []).then(function() {
        pdfManager.ensureDoc('parseStartXRef', []).then(function() {
          pdfManager.ensureDoc('parse', [recoveryMode]).then(
            parseSuccess, parseFailure);
        }, parseFailure);
      }, parseFailure);

      return loadDocumentCapability.promise;
    }

    function getPdfManager(data, evaluatorOptions) {
      var pdfManagerCapability = createPromiseCapability();
      var pdfManager;

      var source = data.source;
      if (source.data) {
        try {
          pdfManager = new LocalPdfManager(docId, source.data, source.password,
                                           evaluatorOptions);
          pdfManagerCapability.resolve(pdfManager);
        } catch (ex) {
          pdfManagerCapability.reject(ex);
        }
        return pdfManagerCapability.promise;
      }

      var pdfStream;
      try {
        if (source.chunkedViewerLoading) {
          pdfStream = new PDFWorkerStream(source, handler);
        } else {
          assert(PDFNetworkStream, 'pdfjs/core/network module is not loaded');
          pdfStream = new PDFNetworkStream(data);
        }
      } catch (ex) {
        pdfManagerCapability.reject(ex);
        return pdfManagerCapability.promise;
      }

      var fullRequest = pdfStream.getFullReader();
      fullRequest.headersReady.then(function () {
        if (!fullRequest.isStreamingSupported ||
            !fullRequest.isRangeSupported) {
          // If stream or range are disabled, it's our only way to report
          // loading progress.
          fullRequest.onProgress = function (evt) {
            handler.send('DocProgress', {
              loaded: evt.loaded,
              total: evt.total
            });
          };
        }

        if (!fullRequest.isRangeSupported) {
          return;
        }

        // We don't need auto-fetch when streaming is enabled.
        var disableAutoFetch = source.disableAutoFetch ||
                               fullRequest.isStreamingSupported;
        pdfManager = new NetworkPdfManager(docId, pdfStream, {
          msgHandler: handler,
          url: source.url,
          password: source.password,
          length: fullRequest.contentLength,
          disableAutoFetch: disableAutoFetch,
          rangeChunkSize: source.rangeChunkSize
        }, evaluatorOptions);
        pdfManagerCapability.resolve(pdfManager);
        cancelXHRs = null;
      }).catch(function (reason) {
        pdfManagerCapability.reject(reason);
        cancelXHRs = null;
      });

      var cachedChunks = [], loaded = 0;
      var flushChunks = function () {
        var pdfFile = arraysToBytes(cachedChunks);
        if (source.length && pdfFile.length !== source.length) {
          warn('reported HTTP length is different from actual');
        }
        // the data is array, instantiating directly from it
        try {
          pdfManager = new LocalPdfManager(docId, pdfFile, source.password,
                                           evaluatorOptions);
          pdfManagerCapability.resolve(pdfManager);
        } catch (ex) {
          pdfManagerCapability.reject(ex);
        }
        cachedChunks = [];
      };
      var readPromise = new Promise(function (resolve, reject) {
        var readChunk = function (chunk) {
          try {
            ensureNotTerminated();
            if (chunk.done) {
              if (!pdfManager) {
                flushChunks();
              }
              cancelXHRs = null;
              return;
            }

            var data = chunk.value;
            loaded += arrayByteLength(data);
            if (!fullRequest.isStreamingSupported) {
              handler.send('DocProgress', {
                loaded: loaded,
                total: Math.max(loaded, fullRequest.contentLength || 0)
              });
            }

            if (pdfManager) {
              pdfManager.sendProgressiveData(data);
            } else {
              cachedChunks.push(data);
            }

            fullRequest.read().then(readChunk, reject);
          } catch (e) {
            reject(e);
          }
        };
        fullRequest.read().then(readChunk, reject);
      });
      readPromise.catch(function (e) {
        pdfManagerCapability.reject(e);
        cancelXHRs = null;
      });

      cancelXHRs = function () {
        pdfStream.cancelAllRequests('abort');
      };

      return pdfManagerCapability.promise;
    }

    var setupDoc = function(data) {
      var onSuccess = function(doc) {
        ensureNotTerminated();
        handler.send('GetDoc', { pdfInfo: doc });
      };

      var onFailure = function(e) {
        if (e instanceof PasswordException) {
          if (e.code === PasswordResponses.NEED_PASSWORD) {
            handler.send('NeedPassword', e);
          } else if (e.code === PasswordResponses.INCORRECT_PASSWORD) {
            handler.send('IncorrectPassword', e);
          }
        } else if (e instanceof InvalidPDFException) {
          handler.send('InvalidPDF', e);
        } else if (e instanceof MissingPDFException) {
          handler.send('MissingPDF', e);
        } else if (e instanceof UnexpectedResponseException) {
          handler.send('UnexpectedResponse', e);
        } else {
          handler.send('UnknownError',
                       new UnknownErrorException(e.message, e.toString()));
        }
      };

      ensureNotTerminated();

      var cMapOptions = {
        url: data.cMapUrl === undefined ? null : data.cMapUrl,
        packed: data.cMapPacked === true
      };
      var evaluatorOptions = {
        forceDataSchema: data.disableCreateObjectURL,
        maxImageSize: data.maxImageSize === undefined ? -1 : data.maxImageSize,
        disableFontFace: data.disableFontFace,
        cMapOptions: cMapOptions
      };

      getPdfManager(data, evaluatorOptions).then(function (newPdfManager) {
        if (terminated) {
          // We were in a process of setting up the manager, but it got
          // terminated in the middle.
          newPdfManager.terminate();
          throw new Error('Worker was terminated');
        }

        pdfManager = newPdfManager;
        handler.send('PDFManagerReady', null);
        pdfManager.onLoadedStream().then(function(stream) {
          handler.send('DataLoaded', { length: stream.bytes.byteLength });
        });
      }).then(function pdfManagerReady() {
        ensureNotTerminated();

        loadDocument(false).then(onSuccess, function loadFailure(ex) {
          ensureNotTerminated();

          // Try again with recoveryMode == true
          if (!(ex instanceof XRefParseException)) {
            if (ex instanceof PasswordException) {
              // after password exception prepare to receive a new password
              // to repeat loading
              pdfManager.passwordChanged().then(pdfManagerReady);
            }

            onFailure(ex);
            return;
          }

          pdfManager.requestLoadedStream();
          pdfManager.onLoadedStream().then(function() {
            ensureNotTerminated();

            loadDocument(true).then(onSuccess, onFailure);
          });
        }, onFailure);
      }, onFailure);
    };

    handler.on('GetPage', function wphSetupGetPage(data) {
      return pdfManager.getPage(data.pageIndex).then(function(page) {
        var rotatePromise = pdfManager.ensure(page, 'rotate');
        var refPromise = pdfManager.ensure(page, 'ref');
        var viewPromise = pdfManager.ensure(page, 'view');

        return Promise.all([rotatePromise, refPromise, viewPromise]).then(
            function(results) {
          return {
            rotate: results[0],
            ref: results[1],
            view: results[2]
          };
        });
      });
    });

    handler.on('GetPageIndex', function wphSetupGetPageIndex(data) {
      var ref = new Ref(data.ref.num, data.ref.gen);
      var catalog = pdfManager.pdfDocument.catalog;
      return catalog.getPageIndex(ref);
    });

    handler.on('GetDestinations',
      function wphSetupGetDestinations(data) {
        return pdfManager.ensureCatalog('destinations');
      }
    );

    handler.on('GetDestination',
      function wphSetupGetDestination(data) {
        return pdfManager.ensureCatalog('getDestination', [data.id]);
      }
    );

    handler.on('GetPageLabels',
      function wphSetupGetPageLabels(data) {
        return pdfManager.ensureCatalog('pageLabels');
      }
    );

    handler.on('GetAttachments',
      function wphSetupGetAttachments(data) {
        return pdfManager.ensureCatalog('attachments');
      }
    );

    handler.on('GetJavaScript',
      function wphSetupGetJavaScript(data) {
        return pdfManager.ensureCatalog('javaScript');
      }
    );

    handler.on('GetOutline',
      function wphSetupGetOutline(data) {
        return pdfManager.ensureCatalog('documentOutline');
      }
    );

    handler.on('GetMetadata',
      function wphSetupGetMetadata(data) {
        return Promise.all([pdfManager.ensureDoc('documentInfo'),
                            pdfManager.ensureCatalog('metadata')]);
      }
    );

    handler.on('GetData', function wphSetupGetData(data) {
      pdfManager.requestLoadedStream();
      return pdfManager.onLoadedStream().then(function(stream) {
        return stream.bytes;
      });
    });

    handler.on('GetStats',
      function wphSetupGetStats(data) {
        return pdfManager.pdfDocument.xref.stats;
      }
    );

    handler.on('UpdatePassword', function wphSetupUpdatePassword(data) {
      pdfManager.updatePassword(data);
    });

    handler.on('GetAnnotations', function wphSetupGetAnnotations(data) {
      return pdfManager.getPage(data.pageIndex).then(function(page) {
        return pdfManager.ensure(page, 'getAnnotationsData', [data.intent]);
      });
    });

    handler.on('RenderPageRequest', function wphSetupRenderPage(data) {
      var pageIndex = data.pageIndex;
      pdfManager.getPage(pageIndex).then(function(page) {
        var task = new WorkerTask('RenderPageRequest: page ' + pageIndex);
        startWorkerTask(task);

        var pageNum = pageIndex + 1;
        var start = Date.now();
        // Pre compile the pdf page and fetch the fonts/images.
        page.getOperatorList(handler, task, data.intent).then(
            function(operatorList) {
          finishWorkerTask(task);

          info('page=' + pageNum + ' - getOperatorList: time=' +
               (Date.now() - start) + 'ms, len=' + operatorList.totalLength);
        }, function(e) {
          finishWorkerTask(task);
          if (task.terminated) {
            return; // ignoring errors from the terminated thread
          }

          // For compatibility with older behavior, generating unknown
          // unsupported feature notification on errors.
          handler.send('UnsupportedFeature',
                       {featureId: UNSUPPORTED_FEATURES.unknown});

          var minimumStackMessage =
            'worker.js: while trying to getPage() and getOperatorList()';

          var wrappedException;

          // Turn the error into an obj that can be serialized
          if (typeof e === 'string') {
            wrappedException = {
              message: e,
              stack: minimumStackMessage
            };
          } else if (typeof e === 'object') {
            wrappedException = {
              message: e.message || e.toString(),
              stack: e.stack || minimumStackMessage
            };
          } else {
            wrappedException = {
              message: 'Unknown exception type: ' + (typeof e),
              stack: minimumStackMessage
            };
          }

          handler.send('PageError', {
            pageNum: pageNum,
            error: wrappedException,
            intent: data.intent
          });
        });
      });
    }, this);

    handler.on('GetTextContent', function wphExtractText(data) {
      var pageIndex = data.pageIndex;
      var normalizeWhitespace = data.normalizeWhitespace;
      return pdfManager.getPage(pageIndex).then(function(page) {
        var task = new WorkerTask('GetTextContent: page ' + pageIndex);
        startWorkerTask(task);
        var pageNum = pageIndex + 1;
        var start = Date.now();
        return page.extractTextContent(task, normalizeWhitespace).then(
            function(textContent) {
          finishWorkerTask(task);
          info('text indexing: page=' + pageNum + ' - time=' +
               (Date.now() - start) + 'ms');
          return textContent;
        }, function (reason) {
          finishWorkerTask(task);
          if (task.terminated) {
            return; // ignoring errors from the terminated thread
          }
          throw reason;
        });
      });
    });

    handler.on('Cleanup', function wphCleanup(data) {
      return pdfManager.cleanup();
    });

    handler.on('Terminate', function wphTerminate(data) {
      terminated = true;
      if (pdfManager) {
        pdfManager.terminate();
        pdfManager = null;
      }
      if (cancelXHRs) {
        cancelXHRs();
      }

      var waitOn = [];
      WorkerTasks.forEach(function (task) {
        waitOn.push(task.finished);
        task.terminate();
      });

      return Promise.all(waitOn).then(function () {
        // Notice that even if we destroying handler, resolved response promise
        // must be sent back.
        handler.destroy();
        handler = null;
      });
    });

    handler.on('Ready', function wphReady(data) {
      setupDoc(docParams);
      docParams = null; // we don't need docParams anymore -- saving memory.
    });
    return workerHandlerName;
  }
};

function initializeWorker() {
  if (!('console' in globalScope)) {
    var consoleTimer = {};

    var workerConsole = {
      log: function log() {
        var args = Array.prototype.slice.call(arguments);
        globalScope.postMessage({
          targetName: 'main',
          action: 'console_log',
          data: args
        });
      },

      error: function error() {
        var args = Array.prototype.slice.call(arguments);
        globalScope.postMessage({
          targetName: 'main',
          action: 'console_error',
          data: args
        });
        throw 'pdf.js execution error';
      },

      time: function time(name) {
        consoleTimer[name] = Date.now();
      },

      timeEnd: function timeEnd(name) {
        var time = consoleTimer[name];
        if (!time) {
          error('Unknown timer name ' + name);
        }
        this.log('Timer:', name, Date.now() - time);
      }
    };

    globalScope.console = workerConsole;
  }

  var handler = new MessageHandler('worker', 'main', self);
  WorkerMessageHandler.setup(handler, self);
  handler.send('ready', null);
}

// Worker thread (and not node.js)?
if (typeof window === 'undefined' &&
    !(typeof module !== 'undefined' && module.require)) {
  initializeWorker();
}

exports.setPDFNetworkStreamClass = setPDFNetworkStreamClass;
exports.WorkerTask = WorkerTask;
exports.WorkerMessageHandler = WorkerMessageHandler;
}));




var NetworkManager = (function NetworkManagerClosure() {

  var OK_RESPONSE = 200;
  var PARTIAL_CONTENT_RESPONSE = 206;

  function NetworkManager(url, args) {
    this.url = url;
    args = args || {};
    this.isHttp = /^https?:/i.test(url);
    this.httpHeaders = (this.isHttp && args.httpHeaders) || {};
    this.withCredentials = args.withCredentials || false;
    this.getXhr = args.getXhr ||
      function NetworkManager_getXhr() {
        return new XMLHttpRequest();
      };

    this.currXhrId = 0;
    this.pendingRequests = Object.create(null);
    this.loadedRequests = Object.create(null);
  }

  function getArrayBuffer(xhr) {
    var data = xhr.response;
    if (typeof data !== 'string') {
      return data;
    }
    var length = data.length;
    var array = new Uint8Array(length);
    for (var i = 0; i < length; i++) {
      array[i] = data.charCodeAt(i) & 0xFF;
    }
    return array.buffer;
  }

  var supportsMozChunked = (function supportsMozChunkedClosure() {
    try {
      var x = new XMLHttpRequest();
      // Firefox 37- required .open() to be called before setting responseType.
      // https://bugzilla.mozilla.org/show_bug.cgi?id=707484
      // Even though the URL is not visited, .open() could fail if the URL is
      // blocked, e.g. via the connect-src CSP directive or the NoScript addon.
      // When this error occurs, this feature detection method will mistakenly
      // report that moz-chunked-arraybuffer is not supported in Firefox 37-.
      x.open('GET', 'https://example.com');
      x.responseType = 'moz-chunked-arraybuffer';
      return x.responseType === 'moz-chunked-arraybuffer';
    } catch (e) {
      return false;
    }
  })();

  NetworkManager.prototype = {
    requestRange: function NetworkManager_requestRange(begin, end, listeners) {
      var args = {
        begin: begin,
        end: end
      };
      for (var prop in listeners) {
        args[prop] = listeners[prop];
      }
      return this.request(args);
    },

    requestFull: function NetworkManager_requestFull(listeners) {
      return this.request(listeners);
    },

    request: function NetworkManager_request(args) {
      var xhr = this.getXhr();
      var xhrId = this.currXhrId++;
      var pendingRequest = this.pendingRequests[xhrId] = {
        xhr: xhr
      };

      xhr.open('GET', this.url);
      xhr.withCredentials = this.withCredentials;
      for (var property in this.httpHeaders) {
        var value = this.httpHeaders[property];
        if (typeof value === 'undefined') {
          continue;
        }
        xhr.setRequestHeader(property, value);
      }
      if (this.isHttp && 'begin' in args && 'end' in args) {
        var rangeStr = args.begin + '-' + (args.end - 1);
        xhr.setRequestHeader('Range', 'bytes=' + rangeStr);
        pendingRequest.expectedStatus = 206;
      } else {
        pendingRequest.expectedStatus = 200;
      }

      var useMozChunkedLoading = supportsMozChunked && !!args.onProgressiveData;
      if (useMozChunkedLoading) {
        xhr.responseType = 'moz-chunked-arraybuffer';
        pendingRequest.onProgressiveData = args.onProgressiveData;
        pendingRequest.mozChunked = true;
      } else {
        xhr.responseType = 'arraybuffer';
      }

      if (args.onError) {
        xhr.onerror = function(evt) {
          args.onError(xhr.status);
        };
      }
      xhr.onreadystatechange = this.onStateChange.bind(this, xhrId);
      xhr.onprogress = this.onProgress.bind(this, xhrId);

      pendingRequest.onHeadersReceived = args.onHeadersReceived;
      pendingRequest.onDone = args.onDone;
      pendingRequest.onError = args.onError;
      pendingRequest.onProgress = args.onProgress;

      xhr.send(null);

      return xhrId;
    },

    onProgress: function NetworkManager_onProgress(xhrId, evt) {
      var pendingRequest = this.pendingRequests[xhrId];
      if (!pendingRequest) {
        // Maybe abortRequest was called...
        return;
      }

      if (pendingRequest.mozChunked) {
        var chunk = getArrayBuffer(pendingRequest.xhr);
        pendingRequest.onProgressiveData(chunk);
      }

      var onProgress = pendingRequest.onProgress;
      if (onProgress) {
        onProgress(evt);
      }
    },

    onStateChange: function NetworkManager_onStateChange(xhrId, evt) {
      var pendingRequest = this.pendingRequests[xhrId];
      if (!pendingRequest) {
        // Maybe abortRequest was called...
        return;
      }

      var xhr = pendingRequest.xhr;
      if (xhr.readyState >= 2 && pendingRequest.onHeadersReceived) {
        pendingRequest.onHeadersReceived();
        delete pendingRequest.onHeadersReceived;
      }

      if (xhr.readyState !== 4) {
        return;
      }

      if (!(xhrId in this.pendingRequests)) {
        // The XHR request might have been aborted in onHeadersReceived()
        // callback, in which case we should abort request
        return;
      }

      delete this.pendingRequests[xhrId];

      // success status == 0 can be on ftp, file and other protocols
      if (xhr.status === 0 && this.isHttp) {
        if (pendingRequest.onError) {
          pendingRequest.onError(xhr.status);
        }
        return;
      }
      var xhrStatus = xhr.status || OK_RESPONSE;

      // From http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.35.2:
      // "A server MAY ignore the Range header". This means it's possible to
      // get a 200 rather than a 206 response from a range request.
      var ok_response_on_range_request =
          xhrStatus === OK_RESPONSE &&
          pendingRequest.expectedStatus === PARTIAL_CONTENT_RESPONSE;

      if (!ok_response_on_range_request &&
          xhrStatus !== pendingRequest.expectedStatus) {
        if (pendingRequest.onError) {
          pendingRequest.onError(xhr.status);
        }
        return;
      }

      this.loadedRequests[xhrId] = true;

      var chunk = getArrayBuffer(xhr);
      if (xhrStatus === PARTIAL_CONTENT_RESPONSE) {
        var rangeHeader = xhr.getResponseHeader('Content-Range');
        var matches = /bytes (\d+)-(\d+)\/(\d+)/.exec(rangeHeader);
        var begin = parseInt(matches[1], 10);
        pendingRequest.onDone({
          begin: begin,
          chunk: chunk
        });
      } else if (pendingRequest.onProgressiveData) {
        pendingRequest.onDone(null);
      } else if (chunk) {
        pendingRequest.onDone({
          begin: 0,
          chunk: chunk
        });
      } else if (pendingRequest.onError) {
        pendingRequest.onError(xhr.status);
      }
    },

    hasPendingRequests: function NetworkManager_hasPendingRequests() {
      for (var xhrId in this.pendingRequests) {
        return true;
      }
      return false;
    },

    getRequestXhr: function NetworkManager_getXhr(xhrId) {
      return this.pendingRequests[xhrId].xhr;
    },

    isStreamingRequest: function NetworkManager_isStreamingRequest(xhrId) {
      return !!(this.pendingRequests[xhrId].onProgressiveData);
    },

    isPendingRequest: function NetworkManager_isPendingRequest(xhrId) {
      return xhrId in this.pendingRequests;
    },

    isLoadedRequest: function NetworkManager_isLoadedRequest(xhrId) {
      return xhrId in this.loadedRequests;
    },

    abortAllRequests: function NetworkManager_abortAllRequests() {
      for (var xhrId in this.pendingRequests) {
        this.abortRequest(xhrId | 0);
      }
    },

    abortRequest: function NetworkManager_abortRequest(xhrId) {
      var xhr = this.pendingRequests[xhrId].xhr;
      delete this.pendingRequests[xhrId];
      xhr.abort();
    }
  };

  return NetworkManager;
})();

(function (root, factory) {
  {
    factory((root.pdfjsCoreNetwork = {}), root.pdfjsSharedUtil,
      root.pdfjsCoreWorker);
  }
}(this, function (exports, sharedUtil, coreWorker) {

  var assert = sharedUtil.assert;
  var createPromiseCapability = sharedUtil.createPromiseCapability;
  var isInt = sharedUtil.isInt;
  var MissingPDFException = sharedUtil.MissingPDFException;
  var UnexpectedResponseException = sharedUtil.UnexpectedResponseException;

  /** @implements {IPDFStream} */
  function PDFNetworkStream(options) {
    this._options = options;
    var source = options.source;
    this._manager = new NetworkManager(source.url, {
      httpHeaders: source.httpHeaders,
      withCredentials: source.withCredentials
    });
    this._rangeChunkSize = source.rangeChunkSize;
    this._fullRequestReader = null;
    this._rangeRequestReaders = [];
  }

  PDFNetworkStream.prototype = {
    _onRangeRequestReaderClosed:
        function PDFNetworkStream_onRangeRequestReaderClosed(reader) {
      var i = this._rangeRequestReaders.indexOf(reader);
      if (i >= 0) {
        this._rangeRequestReaders.splice(i, 1);
      }
    },

    getFullReader: function PDFNetworkStream_getFullReader() {
      assert(!this._fullRequestReader);
      this._fullRequestReader =
        new PDFNetworkStreamFullRequestReader(this._manager, this._options);
      return this._fullRequestReader;
    },

    getRangeReader: function PDFNetworkStream_getRangeReader(begin, end) {
      var reader = new PDFNetworkStreamRangeRequestReader(this._manager,
                                                          begin, end);
      reader.onClosed = this._onRangeRequestReaderClosed.bind(this);
      this._rangeRequestReaders.push(reader);
      return reader;
    },

    cancelAllRequests: function PDFNetworkStream_cancelAllRequests(reason) {
      if (this._fullRequestReader) {
        this._fullRequestReader.cancel(reason);
      }
      var readers = this._rangeRequestReaders.slice(0);
      readers.forEach(function (reader) {
        reader.cancel(reason);
      });
    }
  };

  /** @implements {IPDFStreamReader} */
  function PDFNetworkStreamFullRequestReader(manager, options) {
    this._manager = manager;

    var source = options.source;
    var args = {
      onHeadersReceived: this._onHeadersReceived.bind(this),
      onProgressiveData: source.disableStream ? null :
                         this._onProgressiveData.bind(this),
      onDone: this._onDone.bind(this),
      onError: this._onError.bind(this),
      onProgress: this._onProgress.bind(this)
    };
    this._url = source.url;
    this._fullRequestId = manager.requestFull(args);
    this._headersReceivedCapability = createPromiseCapability();
    this._disableRange = options.disableRange || false;
    this._contentLength = source.length; // optional
    this._rangeChunkSize = source.rangeChunkSize;
    if (!this._rangeChunkSize && !this._disableRange) {
      this._disableRange = true;
    }

    this._isStreamingSupported = false;
    this._isRangeSupported = false;

    this._cachedChunks = [];
    this._requests = [];
    this._done = false;
    this._storedError = undefined;

    this.onProgress = null;
  }

  PDFNetworkStreamFullRequestReader.prototype = {
    _validateRangeRequestCapabilities: function
        PDFNetworkStreamFullRequestReader_validateRangeRequestCapabilities() {

      if (this._disableRange) {
        return false;
      }

      var networkManager = this._manager;
      var fullRequestXhrId = this._fullRequestId;
      var fullRequestXhr = networkManager.getRequestXhr(fullRequestXhrId);
      if (fullRequestXhr.getResponseHeader('Accept-Ranges') !== 'bytes') {
        return false;
      }

      var contentEncoding =
        fullRequestXhr.getResponseHeader('Content-Encoding') || 'identity';
      if (contentEncoding !== 'identity') {
        return false;
      }

      var length = fullRequestXhr.getResponseHeader('Content-Length');
      length = parseInt(length, 10);
      if (!isInt(length)) {
        return false;
      }

      this._contentLength = length; // setting right content length

      if (length <= 2 * this._rangeChunkSize) {
        // The file size is smaller than the size of two chunks, so it does
        // not make any sense to abort the request and retry with a range
        // request.
        return false;
      }

      return true;
    },

    _onHeadersReceived:
        function PDFNetworkStreamFullRequestReader_onHeadersReceived() {

      if (this._validateRangeRequestCapabilities()) {
        this._isRangeSupported = true;
      }

      var networkManager = this._manager;
      var fullRequestXhrId = this._fullRequestId;
      if (networkManager.isStreamingRequest(fullRequestXhrId)) {
        // We can continue fetching when progressive loading is enabled,
        // and we don't need the autoFetch feature.
        this._isStreamingSupported = true;
      } else if (this._isRangeSupported) {
        // NOTE: by cancelling the full request, and then issuing range
        // requests, there will be an issue for sites where you can only
        // request the pdf once. However, if this is the case, then the
        // server should not be returning that it can support range
        // requests.
        networkManager.abortRequest(fullRequestXhrId);
      }

      this._headersReceivedCapability.resolve();
    },

    _onProgressiveData:
        function PDFNetworkStreamFullRequestReader_onProgressiveData(chunk) {
      if (this._requests.length > 0) {
        var requestCapability = this._requests.shift();
        requestCapability.resolve({value: chunk, done: false});
      } else {
        this._cachedChunks.push(chunk);
      }
    },

    _onDone: function PDFNetworkStreamFullRequestReader_onDone(args) {
      if (args) {
        this._onProgressiveData(args.chunk);
      }
      this._done = true;
      if (this._cachedChunks.length > 0) {
        return;
      }
      this._requests.forEach(function (requestCapability) {
        requestCapability.resolve({value: undefined, done: true});
      });
      this._requests = [];
    },

    _onError: function PDFNetworkStreamFullRequestReader_onError(status) {
      var url = this._url;
      var exception;
      if (status === 404 || status === 0 && /^file:/.test(url)) {
        exception = new MissingPDFException('Missing PDF "' + url + '".');
      } else {
        exception = new UnexpectedResponseException(
          'Unexpected server response (' + status +
          ') while retrieving PDF "' + url + '".', status);
      }
      this._storedError = exception;
      this._headersReceivedCapability.reject(exception);
      this._requests.forEach(function (requestCapability) {
        requestCapability.reject(exception);
      });
      this._requests = [];
      this._cachedChunks = [];
    },

    _onProgress: function PDFNetworkStreamFullRequestReader_onProgress(data) {
      if (this.onProgress) {
        this.onProgress({
          loaded: data.loaded,
          total: data.lengthComputable ? data.total : this._contentLength
        });
      }
    },

    get isRangeSupported() {
      return this._isRangeSupported;
    },

    get isStreamingSupported() {
      return this._isStreamingSupported;
    },

    get contentLength() {
      return this._contentLength;
    },

    get headersReady() {
      return this._headersReceivedCapability.promise;
    },

    read: function PDFNetworkStreamFullRequestReader_read() {
      if (this._storedError) {
        return Promise.reject(this._storedError);
      }
      if (this._cachedChunks.length > 0) {
        var chunk = this._cachedChunks.shift();
        return Promise.resolve(chunk);
      }
      if (this._done) {
        return Promise.resolve({value: undefined, done: true});
      }
      var requestCapability = createPromiseCapability();
      this._requests.push(requestCapability);
      return requestCapability.promise;
    },

    cancel: function PDFNetworkStreamFullRequestReader_cancel(reason) {
      this._done = true;
      this._headersReceivedCapability.reject(reason);
      this._requests.forEach(function (requestCapability) {
        requestCapability.resolve({value: undefined, done: true});
      });
      this._requests = [];
      if (this._manager.isPendingRequest(this._fullRequestId)) {
        this._manager.abortRequest(this._fullRequestId);
      }
      this._fullRequestReader = null;
    }
  };

  /** @implements {IPDFStreamRangeReader} */
  function PDFNetworkStreamRangeRequestReader(manager, begin, end) {
    this._manager = manager;
    var args = {
      onDone: this._onDone.bind(this),
      onProgress: this._onProgress.bind(this)
    };
    this._requestId = manager.requestRange(begin, end, args);
    this._requests = [];
    this._queuedChunk = null;
    this._done = false;

    this.onProgress = null;
    this.onClosed = null;
  }

  PDFNetworkStreamRangeRequestReader.prototype = {
    _close: function PDFNetworkStreamRangeRequestReader_close() {
      if (this.onClosed) {
        this.onClosed(this);
      }
    },

    _onDone: function PDFNetworkStreamRangeRequestReader_onDone(data) {
      var chunk = data.chunk;
      if (this._requests.length > 0) {
        var requestCapability = this._requests.shift();
        requestCapability.resolve({value: chunk, done: false});
      } else {
        this._queuedChunk = chunk;
      }
      this._done = true;
      this._requests.forEach(function (requestCapability) {
        requestCapability.resolve({value: undefined, done: true});
      });
      this._requests = [];
      this._close();
    },

    _onProgress: function PDFNetworkStreamRangeRequestReader_onProgress(evt) {
      if (!this.isStreamingSupported && this.onProgress) {
        this.onProgress({
          loaded: evt.loaded
        });
      }
    },

    get isStreamingSupported() {
      return false; // TODO allow progressive range bytes loading
    },

    read: function PDFNetworkStreamRangeRequestReader_read() {
      if (this._queuedChunk !== null) {
        var chunk = this._queuedChunk;
        this._queuedChunk = null;
        return Promise.resolve({value: chunk, done: false});
      }
      if (this._done) {
        return Promise.resolve({value: undefined, done: true});
      }
      var requestCapability = createPromiseCapability();
      this._requests.push(requestCapability);
      return requestCapability.promise;
    },

    cancel: function PDFNetworkStreamRangeRequestReader_cancel(reason) {
      this._done = true;
      this._requests.forEach(function (requestCapability) {
        requestCapability.resolve({value: undefined, done: true});
      });
      this._requests = [];
      if (this._manager.isPendingRequest(this._requestId)) {
        this._manager.abortRequest(this._requestId);
      }
      this._close();
    }
  };

  coreWorker.setPDFNetworkStreamClass(PDFNetworkStream);

  exports.PDFNetworkStream = PDFNetworkStream;
  exports.NetworkManager = NetworkManager;
}));


  }).call(pdfjsLibs);

  exports.WorkerMessageHandler = pdfjsLibs.pdfjsCoreWorker.WorkerMessageHandler;
}));


