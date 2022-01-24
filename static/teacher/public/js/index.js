$(function() {

	//	//table 删除键
	$('.table1').delegate(".look-deleteResource", 'click', function() {
		var _this = $(this);
		if($(".pop-alert").length>0){
			
		}else{
		$('.buttonO').bind('click', function() {
			$('.pop-alert').remove();
			_this.parent().parent().remove();
			
		});
		$('.buttonC').bind('click', function() {
			$('.pop-alert').remove();
		});
		}
	});
	
	
		//alert通用提示
function alert(msg, title) {
	if($(".webAlertBox").length > 0) {
		return false;
	}
	var maskElm = $('<div />').addClass('webMask').appendTo('body')
	var alertElm = $('<div />').addClass('webAlertBox').appendTo('body')
	var titleElm = $('<h4 />').addClass('title').text(title || '提示').appendTo(alertElm)
	var messageElm = $('<p />').addClass('message').html(msg || '').appendTo(alertElm)
	var buttonElm = $('<div />').addClass('button').text('确定').appendTo(alertElm)
	maskElm.show().stop().animate({
		opacity: 0.5
	})
	alertElm.show().stop().animate({
		opacity: 1
	})
	buttonElm.bind('click', function() {
		maskElm.stop().animate({
			opacity: 0
		}, function() {
			$(this).remove()
		})
		alertElm.stop().animate({
			opacity: 0
		}, function() {
			$(this).remove()
		})
	})
}

//弹出框_打开
function popFadeIn(pop) {
	pop.show(function() {
		pop.find(".box").css("margin-top", -pop.find(".box").height() / 2);
		$(this).addClass("popFormIn");
	})
}

// 		上传附件弹窗
		$('.look-uploadfile').click(function() {
					popFadeIn($('#pop_uploadfile'));
				});
})