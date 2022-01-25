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
			"display":"none",
		})
		table.eq(num).css({
			"display":"block",
		})
	})
	}
	tab($(".toread-nav ul li"),$(".toread-con"));
	
	//radio
	$(".homework-con").delegate('.work-radio','click',function(){
		var _this = $(this).find(".radio");
		var _thisval = $(this).attr('data-choose');
		_this.parents('.anntForm-ra').find('.radio-active').removeClass('radio-active');
		_this.addClass('radio-active');
		_this.parent().siblings('.anntType').val(_thisval);
	})
	
	//check
	$(".homework-con").delegate('.work-check','click',function(){
		var _this = $(this).find(".check");
		var _thisval = $(this).find(".check-text").text().substring(0,1);
		var _thisGroup = $(this).parent();
		var _val = '';
		if(_this.hasClass('check-active')) {
				_this.removeClass('check-active');
		} else {
			_this.addClass('check-active');
		}
			
			for(var i = 0; i < _thisGroup.find('.check-active').length; i++) {
				if(_val==""){
					_val=_thisGroup.find('.check-active').eq(i).next('.check-text').text().substring(0,1);
				}else{
					_val +=  ','+ _thisGroup.find('.check-active').eq(i).next('.check-text').text().substring(0,1);
				}
			}
			_this.parent().siblings('.anntType2').val(_val);
	})
	
	//关闭展开
	$(".homework-con").delegate(".homework-check1-title","click",function(){
		$(this).parent().siblings().find(".homework-check1-title").addClass("bgceaf9add");
		$(this).parent().siblings().find(".lineloer-answer").hide();
		$(this).next().toggle();
		var hide = $(this).next().css("display");
		console.log(hide);
		if(hide == "none"){
			$(this).find(".fa-caret-up").addClass("fa-caret-down").removeClass("fa-caret-up");
			$(this).addClass("bgceaf9add");
		}else{
			$(this).find(".fa-caret-down").addClass("fa-caret-up").removeClass("fa-caret-down");
			$(this).removeClass("bgceaf9add");
		}
	})
		
		
	//单选题
	$(".lineloer-answer1").delegate(".look-questions1btn","click",function(){
		if($(this).parents(".lineloer-answer1-pro").hasClass("bgcf0f8")){
			$(this).parents(".lineloer-answer1-pro").removeClass("bgcf0f8");
			$(this).text("选用");
		}else{
			$(this).parents(".lineloer-answer1-pro").addClass("bgcf0f8");
			$(this).text("取消");
		}
	})
	$(".lineloer-answer1").delegate(".lineloer-answer1-pro","click",function(){
		if($(".lineloer-answer1-pro").hasClass("bgcf0f8")){
			$(".checknum1").text($(".lineloer-answer1 .bgcf0f8").length);
		}else{
			$(".checknum1").text(0);
		}
	})
	
	var chcekval = "";
	$("body").delegate(".sureBtn1","click",function(){
		var table2 = $('.table2-1 tbody tr').length+1;
		if($(".lineloer-answer1 .lineloer-answer1-pro").hasClass("bgcf0f8")){
			for(var i = 0; i < $(".lineloer-answer1 .bgcf0f8").length; i++){
				chcekval = $(".lineloer-answer1 .bgcf0f8 .checkval").eq(i).text();
				if((table2+i+1)>=10){
					var trd = $('<tr><td>'+(table2+i+1)+'</td><td class="textL paddingL10">'+chcekval+'</td><td><a class="download marginR14">查看</a><a class="look-deletebtn colore600">删除</a></td></tr>');
				}else{
					var trd = $('<tr><td>0'+(table2+i+1)+'</td><td class="textL paddingL10">'+chcekval+'</td><td><a class="download marginR14">查看</a><a class="look-deletebtn colore600">删除</a></td></tr>');
				}
				$(".table2-1 tbody").append(trd);
				
			}
			
		}
	})
		
		
		//		多选题
		$(".lineloer-answer2").delegate(".look-questions2btn","click",function(){
		if($(this).parents(".lineloer-answer2-pro").hasClass("bgcf0f8")){
			$(this).parents(".lineloer-answer2-pro").removeClass("bgcf0f8");
			$(this).text("选用");
		}else{
			$(this).parents(".lineloer-answer2-pro").addClass("bgcf0f8");
			$(this).text("取消");
		}
	})
	$(".lineloer-answer2").delegate(".lineloer-answer2-pro","click",function(){
		if($(".lineloer-answer2-pro").hasClass("bgcf0f8")){
			$(".checknum2").text($(".lineloer-answer2 .bgcf0f8").length);
		}else{
			$(".checknum2").text(0);
		}
	})
	
	var chcekval = "";
	$("body").delegate(".sureBtn2","click",function(){
		var table2 = $('.table2-2 tbody tr').length+1;
		if($(".lineloer-answer2 .lineloer-answer2-pro").hasClass("bgcf0f8")){
			for(var i = 0; i < $(".lineloer-answer2 .bgcf0f8").length; i++){
				chcekval = $(".lineloer-answer2 .bgcf0f8 .checkval").eq(i).text();
				if((table2+i+1)>=10){
					var trd = $('<tr><td>'+(table2+i+1)+'</td><td class="textL paddingL10">'+chcekval+'</td><td><a class="download marginR14">查看</a><a class="look-deletebtn colore600">删除</a></td></tr>');
				}else{
					var trd = $('<tr><td>0'+(table2+i+1)+'</td><td class="textL paddingL10">'+chcekval+'</td><td><a class="download marginR14">查看</a><a class="look-deletebtn colore600">删除</a></td></tr>');
				}
				$(".table2-2 tbody").append(trd);
				
			}
			
		}
	})
	
	//		判断题
		$(".lineloer-answer3").delegate(".look-questions3btn","click",function(){
		if($(this).parents(".lineloer-answer3-pro").hasClass("bgcf0f8")){
			$(this).parents(".lineloer-answer3-pro").removeClass("bgcf0f8");
			$(this).text("选用");
		}else{
			$(this).parents(".lineloer-answer3-pro").addClass("bgcf0f8");
			$(this).text("取消");
		}
	})
	$(".lineloer-answer3").delegate(".lineloer-answer3-pro","click",function(){
		if($(".lineloer-answer3-pro").hasClass("bgcf0f8")){
			$(".checknum3").text($(".lineloer-answer3 .bgcf0f8").length);
		}else{
			$(".checknum3").text(0);
		}
	})
	
	var chcekval = "";
	$("body").delegate(".sureBtn3","click",function(){
		var table2 = $('.table2-3 tbody tr').length+1;
		if($(".lineloer-answer3 .lineloer-answer3-pro").hasClass("bgcf0f8")){
			for(var i = 0; i < $(".lineloer-answer3 .bgcf0f8").length; i++){
				chcekval = $(".lineloer-answer3 .bgcf0f8 .checkval").eq(i).text();
				if((table2+i+1)>=10){
					var trd = $('<tr><td>'+(table2+i+1)+'</td><td class="textL paddingL10">'+chcekval+'</td><td><a class="download marginR14">查看</a><a class="look-deletebtn colore600">删除</a></td></tr>');
				}else{
					var trd = $('<tr><td>0'+(table2+i+1)+'</td><td class="textL paddingL10">'+chcekval+'</td><td><a class="download marginR14">查看</a><a class="look-deletebtn colore600">删除</a></td></tr>');
				}
				$(".table2-3 tbody").append(trd);
				
			}
			
		}
	})
	
	
	//		名词解释
		$(".lineloer-answer4").delegate(".look-questions4btn","click",function(){
		if($(this).parents(".lineloer-answer4-pro").hasClass("bgcf0f8")){
			$(this).parents(".lineloer-answer4-pro").removeClass("bgcf0f8");
			$(this).text("选用");
		}else{
			$(this).parents(".lineloer-answer4-pro").addClass("bgcf0f8");
			$(this).text("取消");
		}
	})
	$(".lineloer-answer4").delegate(".lineloer-answer4-pro","click",function(){
		if($(".lineloer-answer4-pro").hasClass("bgcf0f8")){
			$(".checknum4").text($(".lineloer-answer4 .bgcf0f8").length);
		}else{
			$(".checknum4").text(0);
		}
	})
	
	var chcekval = "";
	$("body").delegate(".sureBtn4","click",function(){
		var table2 = $('.table2-4 tbody tr').length+1;
		if($(".lineloer-answer4 .lineloer-answer4-pro").hasClass("bgcf0f8")){
			for(var i = 0; i < $(".lineloer-answer4 .bgcf0f8").length; i++){
				chcekval = $(".lineloer-answer4 .bgcf0f8 .checkval").eq(i).text();
				if((table2+i+1)>=10){
					var trd = $('<tr><td>'+(table2+i+1)+'</td><td class="textL paddingL10">'+chcekval+'</td><td><a class="download marginR14">查看</a><a class="look-deletebtn colore600">删除</a></td></tr>');
				}else{
					var trd = $('<tr><td>0'+(table2+i+1)+'</td><td class="textL paddingL10">'+chcekval+'</td><td><a class="download marginR14">查看</a><a class="look-deletebtn colore600">删除</a></td></tr>');
				}
				$(".table2-4 tbody").append(trd);
				
			}
			
		}
	})
	
	
	//		简答题
		$(".lineloer-answer5").delegate(".look-questions5btn","click",function(){
		if($(this).parents(".lineloer-answer5-pro").hasClass("bgcf0f8")){
			$(this).parents(".lineloer-answer5-pro").removeClass("bgcf0f8");
			$(this).text("选用");
		}else{
			$(this).parents(".lineloer-answer5-pro").addClass("bgcf0f8");
			$(this).text("取消");
		}
	})
	$(".lineloer-answer5").delegate(".lineloer-answer5-pro","click",function(){
		if($(".lineloer-answer5-pro").hasClass("bgcf0f8")){
			$(".checknum5").text($(".lineloer-answer5 .bgcf0f8").length);
		}else{
			$(".checknum5").text(0);
		}
	})
	
	var chcekval = "";
	$("body").delegate(".sureBtn5","click",function(){
		var table2 = $('.table2-5 tbody tr').length+1;
		if($(".lineloer-answer5 .lineloer-answer5-pro").hasClass("bgcf0f8")){
			for(var i = 0; i < $(".lineloer-answer5 .bgcf0f8").length; i++){
				chcekval = $(".lineloer-answer5 .bgcf0f8 .checkval").eq(i).text();
				if((table2+i+1)>=10){
					var trd = $('<tr><td>'+(table2+i+1)+'</td><td class="textL paddingL10">'+chcekval+'</td><td><a class="download marginR14">查看</a><a class="look-deletebtn colore600">删除</a></td></tr>');
				}else{
					var trd = $('<tr><td>0'+(table2+i+1)+'</td><td class="textL paddingL10">'+chcekval+'</td><td><a class="download marginR14">查看</a><a class="look-deletebtn colore600">删除</a></td></tr>');
				}
				$(".table2-5 tbody").append(trd);
				
			}
			
		}
	})
	
	
	//		综合论述题题
		$(".lineloer-answer6").delegate(".look-questions6btn","click",function(){
		if($(this).parents(".lineloer-answer6-pro").hasClass("bgcf0f8")){
			$(this).parents(".lineloer-answer6-pro").removeClass("bgcf0f8");
			$(this).text("选用");
		}else{
			$(this).parents(".lineloer-answer6-pro").addClass("bgcf0f8");
			$(this).text("取消");
		}
	})
	$(".lineloer-answer6").delegate(".lineloer-answer6-pro","click",function(){
		if($(".lineloer-answer6-pro").hasClass("bgcf0f8")){
			$(".checknum6").text($(".lineloer-answer6 .bgcf0f8").length);
		}else{
			$(".checknum6").text(0);
		}
	})
	
	var chcekval = "";
	$("body").delegate(".sureBtn6","click",function(){
		var table2 = $('.table2-6 tbody tr').length+1;
		if($(".lineloer-answer6 .lineloer-answer6-pro").hasClass("bgcf0f8")){
			for(var i = 0; i < $(".lineloer-answer6 .bgcf0f8").length; i++){
				chcekval = $(".lineloer-answer6 .bgcf0f8 .checkval").eq(i).text();
				if((table2+i+1)>=10){
					var trd = $('<tr><td>'+(table2+i+1)+'</td><td class="textL paddingL10">'+chcekval+'</td><td><a class="download marginR14">查看</a><a class="look-deletebtn colore600">删除</a></td></tr>');
				}else{
					var trd = $('<tr><td>0'+(table2+i+1)+'</td><td class="textL paddingL10">'+chcekval+'</td><td><a class="download marginR14">查看</a><a class="look-deletebtn colore600">删除</a></td></tr>');
				}
				$(".table2-6 tbody").append(trd);
				
			}
			
		}
	})
	
	//		案例分析题
		$(".lineloer-answer7").delegate(".look-questions7btn","click",function(){
		if($(this).parents(".lineloer-answer7-pro").hasClass("bgcf0f8")){
			$(this).parents(".lineloer-answer7-pro").removeClass("bgcf0f8");
			$(this).text("选用");
		}else{
			$(this).parents(".lineloer-answer7-pro").addClass("bgcf0f8");
			$(this).text("取消");
		}
	})
	$(".lineloer-answer7").delegate(".lineloer-answer7-pro","click",function(){
		if($(".lineloer-answer7-pro").hasClass("bgcf0f8")){
			$(".checknum7").text($(".lineloer-answer7 .bgcf0f8").length);
		}else{
			$(".checknum7").text(0);
		}
	})
	
	var chcekval = "";
	$("body").delegate(".sureBtn7","click",function(){
		var table2 = $('.table2-7 tbody tr').length+1;
		if($(".lineloer-answer7 .lineloer-answer7-pro").hasClass("bgcf0f8")){
			for(var i = 0; i < $(".lineloer-answer7 .bgcf0f8").length; i++){
				chcekval = $(".lineloer-answer7 .bgcf0f8 .checkval").eq(i).text();
				if((table2+i+1)>=10){
					var trd = $('<tr><td>'+(table2+i+1)+'</td><td class="textL paddingL10">'+chcekval+'</td><td><a class="download marginR14">查看</a><a class="look-deletebtn colore600">删除</a></td></tr>');
				}else{
					var trd = $('<tr><td>0'+(table2+i+1)+'</td><td class="textL paddingL10">'+chcekval+'</td><td><a class="download marginR14">查看</a><a class="look-deletebtn colore600">删除</a></td></tr>');
				}
				$(".table2-7 tbody").append(trd);
				
			}
			
		}
	})
		//删除当前tr
		//删除弹窗
		
		$("body").delegate('.look-deletebtn','click',function(){
			popFadeIn($('#pop_deletebtn'));
					var _this = $(this);
					$(".del-sure").click(function(){
						_this.parents("tr").remove();
					})
		})
})