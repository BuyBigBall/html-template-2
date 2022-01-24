$(function() {
	//	表格各行换色
	$('.table1').each(function(){
		$(this).find('tr:first').addClass('bgceaf9')
		$(this).find('tr:even').addClass('bgcf9')
	})
	
	//tab切换
	function tab(button,table){
		button.click(function(){
		button.siblings().removeClass("bgcbule");
		$(this).addClass("bgcbule");
		var num = $(this).index();
		console.log(num)
		table.css({
			"display":"none"
		})
		table.eq(num).css({
			"display":"block"
		})
	})
	}
	tab($(".toread-nav ul li"),$(".tabshow"));
	
	//radio
	$(".homework-con").delegate('.work-radio','click',function(){
		var _this = $(this).find(".radio");
		var _thisval = $(this).find(".radio-text").text();
		_this.parents('.anntForm-ra').find('.radio-active').removeClass('radio-active');
		_this.addClass('radio-active');
		_this.parent().siblings('.anntType').val(_thisval);
	})
	
	//check
	$(".homework-con").delegate('.work-check','click',function(){
		var _this = $(this).find(".check");
		var _thisval = $(this).find(".check-text").text();
		var _thisGroup = $(this).parent();
		var _val = '';
		if(_this.hasClass('check-active')) {
				_this.removeClass('check-active');
		} else {
			_this.addClass('check-active');
		}
			
			for(var i = 0; i < _thisGroup.find('.check-active').length; i++) {
				_val += _thisGroup.find('.check-active').eq(i).next('.check-text').text() + ',';
			}
			_this.parent().siblings('.anntType2').val(_val);
	})
	
	//关闭展开
	$(".homework-con").delegate(".homework-check1-title","click",function(){
		// $(this).parent().siblings().find(".homework-check1-title").addClass("bgceaf9add");
		// $(this).parent().siblings().find(".lineloer-answer").hide();
		$(this).next().toggle();
		var hide = $(this).next().css("display");
		//console.log(hide);
		if(hide == "none"){
			$(this).find(".fa-caret-up").addClass("fa-caret-down").removeClass("fa-caret-up");
			$(this).addClass("bgceaf9add");
		}else{
			$(this).find(".fa-caret-down").addClass("fa-caret-up").removeClass("fa-caret-down");
			$(this).removeClass("bgceaf9add");
		}
		// return false;
	})

		
		
		var _xthis;
		$('body').delegate('.look-questions1', 'click', function() {
			_xthis = $(this);
		})
		//删除当前tr
		//删除弹窗
		
		var _thisDelete;
		$("body").delegate('.look-deletebtn','click',function(){
			 _thisDelete = $(this);
			popFadeIn($('#pop_deleteResource'));
		})
		$('body').delegate('.del-sure','click',function(){	
			var xthis =  _thisDelete.parents('.conR-con-con1-bottom').prev('.conR-con-con1-top').find('.look-questions1');
			_thisDelete.parents("tr").remove();
			var _questionNum =xthis.parents('.conR-con-con1-top').next().find('tbody tr').length;
			console.log(_questionNum);
			var _score = xthis.parents('.conR-con-con1-top').find('.z-score').val();
			console.log(_score);
			xthis.parents('.conR-con-con1-top').find('.checknum').text(_questionNum);
			if(_questionNum!=0){
				xthis.parents('.conR-con-con1-top').find('.the-score').text(Math.floor(_score/_questionNum));

			}else{
				xthis.parents('.conR-con-con1-top').find('.z-score').val("");
				xthis.parents('.conR-con-con1-top').find('.the-score').text("");
				xthis.parents(".conR-con-con1-top").next('.conR-con-con1-bottom').css({'display':'none'});
			}
			
//			点击删除重新排序
			for (var i = 0;i<$('.new-lookL1').parents('.conR-con-con1-top').next().find('tbody tr').length;i++) {
				console.log(i)
				$('.new-lookL1').parents('.conR-con-con1-top').next().find('.tdxuhao').eq(i).text(i+1)
			}
			for (var i = 0;i<$('.new-lookL2').parents('.conR-con-con1-top').next().find('tbody tr').length;i++) {
				console.log(i)
				$('.new-lookL2').parents('.conR-con-con1-top').next().find('.tdxuhao').eq(i).text(i+1)
			}
			for (var i = 0;i<$('.new-lookL3').parents('.conR-con-con1-top').next().find('tbody tr').length;i++) {
				console.log(i)
				$('.new-lookL3').parents('.conR-con-con1-top').next().find('.tdxuhao').eq(i).text(i+1)
			}
			for (var i = 0;i<$('.new-lookL4').parents('.conR-con-con1-top').next().find('tbody tr').length;i++) {
				console.log(i)
				$('.new-lookL4').parents('.conR-con-con1-top').next().find('.tdxuhao').eq(i).text(i+1)
			}
			for (var i = 0;i<$('.new-lookL5').parents('.conR-con-con1-top').next().find('tbody tr').length;i++) {
				console.log(i)
				$('.new-lookL5').parents('.conR-con-con1-top').next().find('.tdxuhao').eq(i).text(i+1)
			}
			for (var i = 0;i<$('.new-lookL6').parents('.conR-con-con1-top').next().find('tbody tr').length;i++) {
				console.log(i)
				$('.new-lookL6').parents('.conR-con-con1-top').next().find('.tdxuhao').eq(i).text(i+1)
			}
			for (var i = 0;i<$('.new-lookL7').parents('.conR-con-con1-top').next().find('tbody tr').length;i++) {
				console.log(i)
				$('.new-lookL7').parents('.conR-con-con1-top').next().find('.tdxuhao').eq(i).text(i+1)
			}



		})
		
})