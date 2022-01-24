$(function() {
	
	
	
	if($(".datepicker").length > 0) {
		$(".datepicker").datepicker({
			inline: true,
			showOtherMonths: true,
			selectOtherMonths: true,
			changeMonth: true,
			changeYear: true,
			yearRange: "1950:2050",
			dateFormat: 'yy-mm-dd'
		});
	}

	//		 <!-- 实例化编辑器 -->
	$('.hasSelectTd').doSelect();
	$('.hasSelectTd01').doSelect();
	$('.hasSelectTd02').doSelect();

	var _xthis;
	$('body').delegate('.look-questions1', 'click', function() {
		popFadeIn($('#pop_questions1'));
		_xthis = $(this);
	})
	
	var currentIndex = "";
	var chcekval = "";
	var num = 0;
//	 var _this2;
	$("body").delegate(".sureBtn1", "click", function() {
//		//2017-05-10新增/修改 2017-05-12注释
//			_xthis.parents('.conR-con-con1-top').siblings('.conR-con-con1-bottom').find('.table2-1').find('tbody').empty();
//			//2017-05-10新增/修改结束
			
							var table2 = $('.table2-1 tbody tr').length;
							var _val = '';
							$('.checkval').each(function() {
								var _this = $(this);
								if(_this.closest('ul').attr('class').indexOf('bgcf0f8') != -1) {
									_val = _this.attr('data-num')
									chcekval = _this.html();
									if((table2 + i + 1) >= 10) {
										var trd = $('<tr><td class="tdxuhao"></td><td class="textL dataval paddingL10" data-new="' + _val + '">' + chcekval + '</td><td><a class="download marginR14 look-questions-t">编辑</a><a class="look-deletebtn colore600">删除</a></td></tr>');
									} else {
										var trd = $('<tr><td class="tdxuhao"></td><td class="textL dataval paddingL10" data-new="' + _val + '">' + chcekval + '</td><td><a class="download marginR14 look-questions-t">编辑</a><a class="look-deletebtn colore600">删除</a></td></tr>');
									}
									_xthis.parents('.conR-con-con1-top').siblings('.conR-con-con1-bottom').find('.table2-1').find('tbody').append(trd)
								}
							})
						


			var _val1 = '';
			$('.checkval1').each(function() {
				var _this = $(this);
				if(_this.closest('ul').find('.exam-case-question').attr('class').indexOf('bgcf0f8') != -1) {
					_val = _this.attr('data-num')
						chcekval = _this.html();
						if((table2 + i + 1) >= 10) {
							var trd = $('<tr><td class="tdxuhao"></td><td class="textL dataval paddingL10" data-new="' + _val + '">' + chcekval + '</td><td><a class="download marginR14 look-questions-t">编辑</a><a class="look-deletebtn colore600">删除</a></td></tr>');
						} else {
							var trd = $('<tr><td class="tdxuhao"></td><td class="textL dataval paddingL10" data-new="' + _val + '">' + chcekval + '</td><td><a class="download marginR14 look-questions-t">编辑</a><a class="look-deletebtn colore600">删除</a></td></tr>');
						}
						_xthis.parents('.conR-con-con1-top').siblings('.conR-con-con1-bottom').find('.table2-1').find('tbody').append(trd)
				}

			})
//			console.log($(".conR-con-con1").find("table").find('tbody tr').length)
			if(_xthis.closest('.conR-con-conL').find("table tbody tr").length > 0) {
				_xthis.closest('.conR-con-conL').find('.conR-con-con1-bottom').css({
					"display": "block"
				});
			} else {
				_xthis.closest('.conR-con-conL').find('.conR-con-con1-bottom').css({
					"display": "none"
				});
			}
			
			//2017-05-13 0：04 -sunxihang
			if($(".lineloer-answer1-pro").hasClass("bgcf0f8")){
				_xthis.closest('.conR-con-con1-top').find('.checknum').text($(".lineloer-answer1 .bgcf0f8").length)
			}else{
				$(".rc-cancelBox .checknum1").text(0);
				// _xthis.closest('.conR-con-con1-top').find(".z-score").val("");
			}
			
		})
		//check
	$(".homework-con").delegate('.work-check', 'click', function() {
		var _this = $(this).find(".check2");
		var _thisval = $(this).find(".check-text").text();
		var _thisGroup = $(this).parent();
		var _val = '';
		if(_this.hasClass('check2-active')) {
			_this.removeClass('check2-active');
		} else {
			_this.addClass('check2-active');
		}

		for(var i = 0; i < _thisGroup.find('.check2-active').length; i++) {
			_val += _thisGroup.find('.check2-active').eq(i).next('.check-text').text() + ',';
		}
		_this.parent().siblings('.anntType2').val(_val);
	})

	//显示隐藏题型列表-by sunjialiang
	$(".showhideCon").click(function() {

		var index = $(this).index();
		$(".conR-con-conL").eq(index).toggle();

		//每次都要重新算序号
		var i = 1;
		$(".conR-con-con").children('div').each(function() {
			var style = $(this).css('display');
			if(style == 'block') {
				$(this).find('.li1 .span1').text(i);
				i++;
			}
		});

	});

	$('.test-newbuiltonline').click(function() {
//			console.log($(this).index())
			$('.homework-newcheck').css({
				"display": "none"
			});
			$('.test-newbuiltonline').removeClass("test-active");
			$('.homework-newcheck').eq($(this).index()).css({
				"display": "block"
			});
			$('.test-newbuiltonline').eq($(this).index()).addClass("test-active")
		})
		//	计算每道题的分值		
//		if($('.popMask2').Length>1){
//			return false;
//		}
	$(".z-score").keyup(function() {
		var _this = $(this);
		var _thisNum = _this.parent().siblings('.li6').find('.checknum').text();
		console.log(_this.closest('.conR-con-conL').find('.table2').find('tr').length);
		if(_thisNum==""||_this.closest('.conR-con-conL').find('.table2').find('tr').length<=1){
			_this.val("");
			alert('请选择题目')
			return false;
		}else{
			_this.parent().siblings($('.li6')).find(".the-score").text(Math.floor(_this.val() / _this.parent().siblings('.li6').find('.checknum').text()))
		}
	})



		

	//点击选择试题
	$("body").delegate(".J_paperBtn","click",function(){
		currentIndex = this ;
	})
	
	//点击选用	
	$("body").delegate(".look-questions1btn", "click", function() {
		
		var _this = this;
		_this2 = $(this)
		
		//2017-05-10添加修改
		var editorIndex = $(currentIndex).parents("div").parents("div").next().find(".textL");
		$.each($(".look-questions1btn"),function(ooindex,oitem){
			if(_this2.closest('li').prev().text() == editorIndex.eq(ooindex).text()){
				editorIndex.eq(ooindex).closest('tr').remove();	
//				var aaa =_xthis.parents('.conR-con-con1-top').next().find('tbody tr').length;
//				console.log(aaa)
				var aaa =_xthis.parents('.conR-con-con1-top').next().find('tbody tr').length;
				var _score = _xthis.closest('ul').find('.z-score').val();
				_xthis.closest('.conR-con-con1-top').find('.checknum').text(aaa);
				if(_score!=""){
					_xthis.closest('ul').find('.the-score').text(Math.floor(_score/aaa));
				}
				for (var i = 0;i<_xthis.parents('.conR-con-con1-top').next().find('tbody tr').length;i++) {
		//				console.log(i)
					_xthis.parents('.conR-con-con1-top').next().find('.tdxuhao').eq(i).text(i+1)
				}
			}
		})
		//2017-05-10添加修改结束
		if(editorIndex.length){
			var c = 1;
			//2017-05-10删除
//			$.each(editorIndex,function (i,item){
//				if($(_this).parents("li").prev().text() == editorIndex.eq(i).text()){
//					alert("这个你已经选过了");
//					c = 0;
//					return false;
//				}
//			})
			//2017-05-10删除结束
			if(c != 0){
				if($(this).parents(".lineloer-answer1-pro").hasClass("bgcf0f8")||$(this).parents(".lineloer-answer1-pro").hasClass("bg0808")) {
					$(this).parents(".lineloer-answer1-pro").removeClass("bgcf0f8").removeClass('bg0808');
					//2017-04-28添加按钮区分脚本
					$(this).text("选用").removeClass('btnBg-grey').addClass('btnBg-green');
				} else {
					$(this).parents(".lineloer-answer1-pro").addClass("bgcf0f8");
					//2017-04-28添加按钮区分脚本
					$(this).text("取消").removeClass('btnBg-green').addClass('btnBg-grey');
					_xthis.parents()
				}
			}
		}else{
			if($(this).parents(".lineloer-answer1-pro").hasClass("bgcf0f8")||$(this).parents(".lineloer-answer1-pro").hasClass("bg0808")) {
				$(this).parents(".lineloer-answer1-pro").removeClass("bgcf0f8").removeClass('bg0808');
				//2017-04-28添加按钮区分脚本
				$(this).text("选用").removeClass('btnBg-grey').addClass('btnBg-green');
			} else {
				$(this).parents(".lineloer-answer1-pro").addClass("bgcf0f8");
				//2017-04-28添加按钮区分脚本
				$(this).text("取消").removeClass('btnBg-green').addClass('btnBg-grey');
				_xthis.parents()
			}
		}
	})
	
	//选用题目数量
	$("body").delegate(".lineloer-answer1-pro","click",function(){
		 if($(".lineloer-answer1-pro").hasClass("bgcf0f8")){
		 	$(".rc-cancelBox  .checknum1").text($(".lineloer-answer1 .bgcf0f8").length);
		 }else if($(".lineloer-answer1-pro").hasClass("bg0808")){
		 	$(".rc-cancelBox  .checknum1").text($(".lineloer-answer1 .bg0808").length);
		 }else{
		 	// $(".checknum1").text(0);
			$(".rc-cancelBox .checknum1").text(0);
			// _xthis.closest('.conR-con-con1-top').find(".z-score").val("");		 	
		 }
	})

	//	点击案例的选用
	$("body").delegate(".question-case-choose", "click", function() {
		var _this = this;
		_this2 = $(this)
		//2017-05-10添加修改
		var editorIndex = $(currentIndex).parents("div").parents("div").next().find(".textL");
		$.each($(".question-case-choose"),function(ooindex,oitem){
			if(_this2.closest('li').find('.mainTitleTxt').text() == editorIndex.eq(ooindex).text()){
				editorIndex.eq(ooindex).closest('tr').remove();	
				var aaa =_xthis.parents('.conR-con-con1-top').next().find('tbody tr').length;
		 		var _score = _xthis.closest('ul').find('.z-score').val();
		 		_xthis.closest('.conR-con-con1-top').find('.checknum').text(aaa);
		 		if(_score!=""){
		 			_xthis.closest('ul').find('.the-score').text(Math.floor(_score/aaa));
		 		}else{
					_xthis.closest('ul').find('.the-score').text("");
				}
		 		for (var i = 0;i<_xthis.parents('.conR-con-con1-top').next().find('tbody tr').length;i++) {
		 //				console.log(i)
		 			_xthis.parents('.conR-con-con1-top').next().find('.tdxuhao').eq(i).text(i+1)
		 		}
			}
		})
		
		//2017-05-12添加题目数量
		var _choosenLength = $('.bg0808').length;
		// $('.rc-cancelBox .checknum1').text(_choosenLength); 
		// $('.checknum1').text(_choosenLength);
		_xthis.closest('.conR-con-con1-top').find('.checknum').text(_choosenLength);

		//2017-05-12添加题目数量结束
		
		if(editorIndex.length){
			var c = 1;
//			$.each(editorIndex,function (i,item){
//				if($(_this).prev().prev().text() == editorIndex.eq(i).text()){
//					alert("这个你已经选过了");
//					c = 0;
//					return false;
//				}
//			})
			if(c != 0){
				if($(this).parents(".question-case-mainTitle").siblings('.exam-case-question').hasClass("bgcf0f8")||$(this).parents(".question-case-mainTitle").siblings('.exam-case-question').hasClass("bg0808")) {
					$(this).parents(".question-case-mainTitle").siblings('.exam-case-question').removeClass("bgcf0f8").removeClass('bg0808');
					$(this).text("选用").removeClass('btnBg-grey').addClass('btnBg-green');
				} else {
					$(this).parents(".question-case-mainTitle").siblings('.exam-case-question').addClass("bgcf0f8");
					$(this).text("取消").removeClass('btnBg-green').addClass('btnBg-grey');
					//				_xthis.parents()
				}
			}
		}else{
			if($(this).parents(".question-case-mainTitle").siblings('.exam-case-question').hasClass("bgcf0f8")||$(this).parents(".question-case-mainTitle").siblings('.exam-case-question').hasClass("bg0808")) {
				$(this).parents(".question-case-mainTitle").siblings('.exam-case-question').removeClass("bgcf0f8").removeClass('bg0808');
				$(this).text("选用").removeClass('btnBg-grey').addClass('btnBg-green');
			} else {
				$(this).parents(".question-case-mainTitle").siblings('.exam-case-question').addClass("bgcf0f8");
				$(this).text("取消").removeClass('btnBg-green').addClass('btnBg-grey');
				//				_xthis.parents()
			}
		}
		
	})
	
	//2017-05-12案例分析题选用题目数量
	$("body").delegate(".question-case-box","click",function(){
		if($('.question-case-box').find('.exam-case-question').hasClass("bgcf0f8")){
			$(".rc-cancelBox  .checknum1").text($(".question-case-box .bgcf0f8").length);
		}else if($('.question-case-box').find('.exam-case-question').hasClass("bg0808")){
			$(".rc-cancelBox  .checknum1").text($(".question-case-box .bg0808").length);
		}else{
			// $(".checknum1").text(0);
			$(".rc-cancelBox .checknum1").text(0);
		}
	})

	
		//向选泽按钮添加不同class
	for(var i = 0; i < $('.look-questions1').length; i++) {
		$('.look-questions1').eq(i).addClass('new-lookL' + (i + 1));
		$('.look-questions1').eq(i).attr('data-L', 'newLid' + (i + 1))
	}

	//表格序号排列
	$('body').delegate('.sureBtn1', 'click', function() {
		var aaa =_xthis.parents('.conR-con-con1-top').next().find('tbody tr').length;
		var _score = _xthis.closest('ul').find('.z-score').val();
		
		_xthis.closest('.conR-con-con1-top').find('.checknum').text(aaa);
		if(_score!=""){
			_xthis.closest('ul').find('.the-score').text(Math.floor(_score/aaa));
		}else{
			_xthis.closest('ul').find('.the-score').text("");
		}

		if(aaa == 0){
			_xthis.closest('ul').find('.z-score').val("");
			_xthis.closest('ul').find('.the-score').text("");
		}
//		console.log(aaa);
		for(var i = 0; i < $('.table2-1 tbody tr').length; i++) {
			_xthis.parents('.conR-con-con1-top').next().find('.tdxuhao').eq(i).text(i + 1);
		}
	})

})