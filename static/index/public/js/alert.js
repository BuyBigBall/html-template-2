//通用alert
		function alert(msg, url) {
			if($('.popAlert').length>0){
				return false;
			}
			var maskElm = $('<section />').addClass('popMask2').appendTo('body');
			var alertElm = $('<section />').addClass('popAlert2').appendTo('body');
			var alertTittle = $('<div />').addClass('popTittle2').text("温馨提示").appendTo(alertElm);
			var popX =  $('<span />').addClass('popClose2').text("×").appendTo(alertTittle)
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
		}