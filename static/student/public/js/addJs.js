//单页面脚本
$(function(){

	//学生答题试卷页面
	//试卷倒计时
		
	if($('.exam-time-countDown').length>0){
		var txt = $.trim(parseInt($('.exam-time-countDown').text()))
		var st = setInterval(function(){
			--txt;
			if(txt==0){
				clearInterval(st)
				//$('.exam-form').submit();
				answerPost();
			}
			$('.exam-time-countDown').text(txt)
		},60000)
	}
	
	//试卷提交
	$('.exam-sure').click(function(){
		$('.exam-form').submit();
	})
	
	//试卷预览 报错
	$('.exam-error-subBtn').click(function(){
		var _val = $('.exam-error-form textarea').val();
		if(_val==""){
			alert('请输入内容');
		}else{
			$('.exam-error-form').submit()
		}
	})


	//首页脚本
	//2017-02-28添加鼠标移入课程冲突
	$('.courseError').hover(function(){
		var _this = $(this);
		_this.closest('td').find('.course-error-tip').fadeIn();
	},function(){
		var _this = $(this);
		_this.closest('td').find('.course-error-tip').fadeOut();
	})
	//鼠标移入班级
	$('.hoverClass').hover(function(){
		var _bg = $(this).css('background-color');
		// console.log(_bg);
		$(this).closest('td').find('.courseCnt').fadeIn().find('.class div').css('background-color',_bg);
	},function(){
		$(this).closest('td').find('.courseCnt').fadeOut();
	})
	
	//radio
	$('.mnRadio-ra').click(function(){
		$('.checkbox-ra').removeClass('annt-checkbox-checked')
		$('#anntDetails').val("")
		$(this).closest('tr').find('.checkbox-ra').removeAttr('disabled');
		$('.mnRadio-ra').removeClass('annt-radio-choosed');
		$(this).toggleClass('annt-radio-choosed');
		$('#anntType').val($(this).text());
	})
	
	//2017-03-24添加
	$('.td-selectBox').doSelect();
	
	// $('.check').click(function(){
	// 	$(this).toggleClass('check-active')
	// })
	
	$('.mnOption-info-tec li').click(function(){
		var _index = $(this).index();
		var _this = $(this);
		_this.closest('table').find('.td-send-chooseType').find('.send-type').eq(_index).show().siblings('.send-type').hide();
	})
	
	
})