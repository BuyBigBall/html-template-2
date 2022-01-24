//公用脚本
//通用alert
function alert(msg, url) {
	//只有在考试模块或者创建线上作业时有下六行代码
	var _d=request("_d");
	var _f=request("_f");
	if(_d == "examination"||_f=="online_create"){
		if($('.popAlert2').length > 0) {
			return false;
		}
	}
	//end
	var maskElm = $('<section />').addClass('popMask2').appendTo('body');
	var alertElm = $('<section />').addClass('popAlert2').appendTo('body');
	var alertTittle = $('<div />').addClass('popTittle2').text("温馨提示").appendTo(alertElm);
	var popX = $('<span />').addClass('popClose2').text("×").appendTo(alertTittle)
	var messageElm = $('<div />').addClass('popCnt2').html(msg || '').appendTo(alertElm);
	var yesElm = $('<span />').addClass('popBtn2').text('确定').appendTo(alertElm);
	maskElm.show();
	alertElm.show();
	maskElm.add(yesElm).bind('click', function() {
		maskElm.hide(0, function() {
			$(this).remove();
		})
		alertElm.hide(0, function() {
			$(this).remove();
		})
	})
	maskElm.add(alertTittle).bind('click', function() {
		maskElm.hide(0, function() {
			$(this).remove();
		})
		alertElm.hide(0, function() {
			$(this).remove();
		})
	})
	if(url && url != "") {
		yesElm.bind('click', function() {
			location.href = url;
		})
	}
	return false;
}

//输入框border变色
$('.ipt2').focus(function() {
	$(this).addClass('curIptBorder')
})

$('.ipt2').blur(function() {
	$(this).removeClass('curIptBorder')
})

//模拟输入框border变色
$('.ipt').focus(function() {
	var _this = $(this)
		//	_this.addClass('curIptBorder')
	_this.closest('.input-wraps').addClass('curIptBorder').find('.inputTip').hide();

})

$('.ipt').blur(function() {
	$('.input-wraps').removeClass('curIptBorder');
	if($.trim($(this).val()) == "") {
		$(this).closest('.input-wraps').find('.inputTip').show();
	}
})

//输入框输入字体颜色
$('.input-wraps .inpt' || '.input-wraps .textarea').bind('input', function() {
	$(this).css('color', '#333')
})

//输入框提示
$('body').delegate('.inputTip', 'click', function() {
	var _this = $(this);
	$(this).hide();
	$(this).prev().focus();
	_this.closest('.input-wraps').find('input,textarea').blur(function() {
		if($.trim($(this).val()) == '') {
			_this.show();
		}
	})
	_this.find('textarea').focus(function() {
		$(this).siblings('.inputTip').hide();
	})
})

//弹出框_打开
function popFadeIn(pop) {
	pop.show(function() {
		pop.find(".box").css("margin-top", -pop.find(".box").height() / 2);
		$(this).addClass("popFormIn");
		//		$(this).fadeIn()
	})
}
//弹出框_关闭
function popFadeOut(pop) {
	pop.addClass("popFormOut");
	setTimeout(function() {
		pop.removeClass("popFormIn popFormOut").hide();
	}, 200)
}

//关闭弹出框
$(".closePop,.popForm .mask,.closeBtn,.confirmBtn,.Release,.closeIcon,.closeBtn,.cancel").click(function() {
	popFadeOut($(this).parents(".popForm"));

})

//去左右margin border 
//动态设置不同分辨率下的margin值
function doList(parentElem, elem, n) {
	$(parentElem).find(elem).removeClass('mgrL0');
	$(parentElem).find(elem).removeClass('last-teamDes');
	var _len = $(parentElem).find(elem).length; //当前页搜索结果，案例个数
	for(var i = 0; i < _len; i++) {
		if(i % n == 0) { //让行数据的第一个清除margin
			$(parentElem).find(elem).eq(i).addClass('mgrL0');
		}
		if(i % n == (n - 1)) {
			$(parentElem).find(elem).eq(i).addClass('last-teamDes');
		}
	}
}

//模拟select
$.fn.extend({
	doSelect: function(options) {
		var _this = this;
		var elem_div = _this.find('div');
		var elem_ul = _this.find('ul');
		elem_div.click(function(e) {
			ev = e || window.event;
			elem_ul.show();
			ev.stopPropagation();
		});
		elem_ul.delegate('li', 'click', function() {
			elem_div.text($(this).text());
		})
		$('body').click(function() {
			elem_ul.hide();
		})
	},
	doSelect2: function(options) {
		var _this = this;
		var elem_div = _this.find('div');
		var elem_ul = _this.find('ul');
		elem_div.click(function(e) {
			ev = e || window.event;
			elem_ul.show();
			ev.stopPropagation();
		});
		elem_ul.delegate('li', 'click', function() {
			elem_ul.find('li').removeClass('selActive');
			$(this).addClass('selActive');
			if(elem_ul.find('.selActive').attr('date-way') == 'allCho') {
				$('.iB-table').find('tr').addClass('chooseMail');
				$('.iB-table').find('tr .check').addClass('check-active');
			} else if(elem_ul.find('.selActive').attr('date-way') == 'allnoCho') {
				$('.iB-table').find('tr').removeClass('chooseMail');
				$('.iB-table').find('tr .check').removeClass('check-active');
			} else if(elem_ul.find('.selActive').attr('date-way') == 'read') {
				$('.iB-table').find('.chooseMail .iconfont').empty();
				$('.iB-table').find('.chooseMail .iconfont').removeClass('iC-act');
				$('.iB-table').find('.chooseMail .iconfont').html('&#xe68a;');
			} else if(elem_ul.find('.selActive').attr('date-way') == 'unread') {
				$('.iB-table').find('.chooseMail .iconfont').empty();
				$('.iB-table').find('.chooseMail .iconfont').html('&#xe61d;');
				$('.iB-table').find('.chooseMail .iconfont').addClass('iC-act');
			} else {
			}
		})

		$('body').click(function() {
			elem_ul.hide();
		})
	}

})

//选择上传
if($(".fileUploaderBox").length > 0) {
	$(".fileUploaderBox .fileField").change(function() {
		var _this = $(this);
		var pathArray = _this.val().split("\\");
		var fieldId = _this.attr("for");
		$("#" + fieldId).val(pathArray[pathArray.length - 1]);
	})
}

//获取链接中的参数
function request(name) {
	var reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)', 'i');
	var r = window.location.search.substr(1).match(reg);
	if (r != null) {
		return unescape(r[2]);
	}
	return null;
}
