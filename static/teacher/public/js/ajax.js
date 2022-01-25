$(function() {
	$('.chooseFirst').click(function(){
		$('.paperTypeBtn').removeClass('test-active');
		$('.paperTypeBtn').eq(0).addClass('test-active');
	})
	
	//获取题型
	var _type;
	$('.paperBtn-type').click(function() {
		_type = $(this).closest('ul').find('.li2').attr('id');
	})
	

	
	//弹出层按钮样式
	$('.paperTypeBtn').click(function(){
		$('.paperTypeBtn').removeClass('test-active');
		$(this).addClass('test-active');
	})
	//按钮调用ajax
	question_paper('.paperBtn');

	//2017-05-10添加修改
	var currentIndex="";
	$("body").delegate(".J_paperBtn","click",function(){
		currentIndex = $(this) ;
		// var editorIndex = $(currentIndex).parents("div").parents("div").next().find(".textL");
		// console.log($(".look-questions1btn").closest('li').prev().length);
// 		$.each($(".look-questions1btn"),function(ooindex,oitem){
// //			console.log($(".look-questions1btn").eq(ooindex).closest('li').prev().text())
// 			if($(".look-questions1btn").eq(ooindex).closest('li').prev().text() == editorIndex.eq(ooindex).text()){
// 				$(".look-questions1btn").eq(ooindex).text("取消").addClass('btnBg-grey').addClass('notAllow').removeClass('btnBg-green');
// 				$(".look-questions1btn").eq(ooindex).closest('.check-radio').addClass("bgcf0f8");
// 			}
// 		})
	})
	//2017-05-10添加修改结束	

	//ajax获取题目ajax
	function question_paper(q) {
		//		var _this = $(this);
		$(q).click(function() {
			
			$('.exam-box-get').empty();
			var _this = $(this);
			var _id = _this.attr('id'); //当前题型默认试卷id
			$.ajax({
				type:"post",
				data:{id:_id,ctype:_type},
				dataType:"json",
				url:"source/teacher/ajax/ajax.exam.selectquestion.json", 
				success:function(data){
				console.log(data);
				// console.log($(".look-questions1btn").closest('li').prev().length);
				//radio 选中样式class disradio-active
				//checkbox 选中样式class discheck-active
				if(data.qType == '1') { //单选题在这里
					//console.log('单选')
					$.each(data.listDanx, function(i, item) {
						var _example_an = "";
						var _example_dx = "";
						$.each(item.an, function(j, value) {
							if(value.substring(0, 1) == item.anT) {
								_example_an += '<li>' + '<div class="work-radio">' + '<div class="disradio-active floatL"></div>' + '<div class="radio-text floatL">' + value + '</div>' + '<div class="clear_float"></div>' + '</div>' + '</div>' + '</li>';
							} else {
								_example_an += '<li>' + '<div class="work-radio">' + '<div class="disradio floatL"></div>' + '<div class="radio-text floatL">' + value + '</div>' + '<div class="clear_float"></div>' + '</div>' + '</div>' + '</li>';
							}
						});
						_example_dx = '<ul class="check-radio lineloer-answer1-pro paddingL10">' + '<li class="floatL checkval" data-num="' + item.id + '">'+(i+1)+'、'  + item.title + '</li>' + '<li class="floatR wauto">' + '<div class="tittleButtonGroup2 hAuto" style="float: initial;">' + '<a class="btnBg-green look-questions1btn" style="top: 0; width: 80px; margin-right: 30px;">选用</a>' + '</div>' + '</li>' + '<div class="clear_float"></div>' + _example_an + '</ul>';
						$('.exam-box-get').append(_example_dx);
					});
				

				} else if(data.qType == '2') { //多选题在这里
					//console.log('多选')
					$.each(data.listDuox, function(i, item) {
						var _example_an = [];
						var correctAnsArray = item.anT.split(",");
						var _example_duox = "";
						//变成数组存储答案
						$.each(item.an, function(j, value) {
							_example_an.push('<div class="work-radio"><div class="discheck floatL"></div><div class="radio-text floatL">' + value + '</div><div class="clear_float"></div></div>');
						});
						//						循环正确答案
						$.each(_example_an, function(k, group) {
							$.each(correctAnsArray, function(i, val) {
								if(group.indexOf(val) >= 0) {
									_example_an[k] = '<div class="work-radio"><div class="discheck-active floatL"></div><div class="radio-text floatL">' + item.an[k] + '</div><div class="clear_float"></div></div>';
								}
							});
						})
						_example_duox = '<ul class="check-radio lineloer-answer1-pro paddingL10">' +
							'<li class="floatL checkval" data-num="' + item.id + '">'+(i+1)+'、'  + item.title + '</li>' +
							'<li class="floatR wauto">' +
							'<div class="tittleButtonGroup2 hAuto" style="float: initial;">' +
							'<a class="btnBg-green look-questions1btn" style="top: 0; width: 80px; margin-right: 30px;">选用</a>' +
							'</div>' +
							'</li>' +
							'<div class="clear_float"></div>' +
							'<li>' +
							'<form method="" action="" class="anntForm-ra paddingT6">' + _example_an.join("") +
							'<input type="hidden" name="anntType" class="anntType" value="" />' +
							'</form>' +
							'</li>' +
							'</ul>';
						$('.exam-box-get').append(_example_duox);
					});
				} else if(data.qType == '3') { //判断题在这里
					//console.log('判断')
					$.each(data.listpd, function(i, item) {
						var _example_an = "";
						var _example_pand = "";

						if(item.anT == "正确") {
							_example_an = '<div class="disradio-active  floatL"></div>' +
								'<div class="radio-text floatL" style="margin-right: 16px;">' +
								'正确' +
								'</div>' +
								'<div class="disradio floatL"></div>' +
								'<div class="radio-text floatL">' +
								'错误' +
								'</div>';
						} else {
							_example_an = '<div class="disradio  floatL"></div>' +
								'<div class="radio-text floatL" style="margin-right: 16px;">' +
								'正确' +
								'</div>' +
								'<div class="disradio-active floatL"></div>' +
								'<div class="radio-text floatL">' +
								'错误' +
								'</div>';
						}
						_example_pand = '<ul class="check-radio lineloer-answer1-pro paddingL10">' +
							'<li class="floatL checkval" data-num="' + item.id + '">'+(i+1)+'、'  + item.title + '</span></li>' +
							'<li class="floatR wauto">' +
							'<div class="tittleButtonGroup2 hAuto" style="float: initial;">' +
							'<a class="btnBg-green look-questions1btn" style="top: 0; width: 80px; margin-right: 30px;">选用</a>' +
							'</div>' +
							'</li>' +
							'<div class="clear_float"></div>' +
							'<li>' +
							'<form method="" action="" class="anntForm-ra paddingT6">' +
							'<div class="work-radio">' +
							'<div class="floatL">答案：</div>' + _example_an +
							'<div class="clear_float"></div>' +
							'</div>' +
							'<input type="hidden" name="anntType" class="anntType" value="" />' +
							'</form>' +
							'</li>' +
							'</ul>';
						$('.exam-box-get').append(_example_pand);
					});
				} else if(data.qType == '4') { //名词解释题在这里
					$.each(data.listmc, function(i, item) {
						var _example_mc ='<ul class="check-radio lineloer-answer1-pro paddingL10"><li class="floatL checkval" data-num="' + item.id + '">'+(i+1)+'、'  + item.title + '</span></li><li class="floatR wauto"><div class="tittleButtonGroup2 hAuto" style="float: initial;"><a class="btnBg-green look-questions1btn" style="top: 0; width: 80px; margin-right: 30px;">选用</a></div></li><div class="clear_float"></div><li><form method="" action="" class="anntForm-ra paddingT6"><div class="work-radio"><div><div class="student font16">答案</div><div class="answer1 width811 marginT10">' + item.anT + '</div></div></div><input type="hidden" name="anntType" class="anntType" value="" /></form></li></ul>';
						$('.exam-box-get').append(_example_mc);
					});
				} else if(data.qType=='5'){//案例分析题在这里
					//console.log('案例')
					$.each(data.listal, function(i,item) {
						var _example_t2 = "";
						$.each(item.title2, function(t,t2) {
							_example_t2 += '<h1>'+t2+'</h1><div class="trueTip">参考答案</div><div class="question-case-anwser">'+item.anT[t]+'</div>';
						});
						var _example_al = '<ul class="question-case-box"><li class="question-case-mainTitle"><span class="mainTitleTxt checkval1" data-num="' + item.id + '">'+(i+1)+'、' +item.title1+'</span><span class="toggleBtn-case toggleBtn-open">展开正文</span><div class="question-chooseBtn question-case-choose btnBg-green">选用</div></li><li class="question-case-cnt"><p>'+item.cnt+'</p></li><li class="exam-case-question">'+_example_t2+'</li></ul>';
						$('.exam-box-get').append(_example_al);
					});
				}
				// console.log($(".look-questions1btn").closest('li').prev().length);
				var editorIndex = $(currentIndex).parents("div").parents("div").next().find(".textL");
				// console.log(editorIndex.length);
				$.each($(".look-questions1btn"),function(ooindex,oitem){
					// console.log($(".look-questions1btn").eq(ooindex).closest('li').prev().text());
					$.each(editorIndex,function(i,k){
						if($(".look-questions1btn").eq(ooindex).closest('li').prev().text() == editorIndex.eq(i).text()){
							$(".look-questions1btn").eq(ooindex).text("取消").addClass('btnBg-grey').addClass('notAllow').removeClass('btnBg-green');
							$(".look-questions1btn").eq(ooindex).closest('.check-radio').addClass("bg0808");
						}
					})
				})		
				
				//2017-05-12添加案例分析默认选中
				$.each($(".question-case-choose"),function(ooindex,oitem){
					// console.log($(".look-questions1btn").eq(ooindex).closest('li').prev().text());
					$.each(editorIndex,function(i,k){
						if($(".question-case-choose").eq(ooindex).closest('li').find('.mainTitleTxt').text() == editorIndex.eq(i).text()){
							$(".question-case-choose").eq(ooindex).text("取消").addClass('btnBg-grey').addClass('notAllow').removeClass('btnBg-green');
							$(".question-case-choose").eq(ooindex).closest('.question-case-box').find('.exam-case-question').addClass('bg0808');
						}
					})
				})
				//2017-05-12案例分析默认选中结束
				
				//2017-05-12-ev添加题目数量
				var _choosenLength = $('.bg0808').length;
				$('.rc-cancelBox .checknum1').text(_choosenLength);
				//2017-05-12-ev添加题目数量结束
				
				}

			});
		})

	}

	//搜索
	question_paper_search('.fa-search')

	function question_paper_search(s) {
		//		var _this = $(this);
		$(s).click(function() {

			var _this = $(this);
//			var _id = _this.attr('id');
			//var _id = _this.closest('h1').find('.test-active').attr('id');
			var _val = _this.closest('h1').find('.serVal').val();
			if(_val == "") {
				alert('请输入搜索内容');
				return false;
			} else {
				$('.exam-box-get').empty();
				$.ajax({
					type:"post",
					data:{ctype:_type,keyword:_val},
					dataType:'json',
					url:"source/teacher/ajax/ajax.exam.selectquestion.json",
				/*var data = {
						//     			status : "success", //非success则均为错误结果，会忽略body数据
						//     			message : "",  //自定义错误提示,为空则使用JS默认的提示
						//     			body : {
						listDanx: [ //单选题
							{
								title: "1.这是单选题目题目题目题目题目",
								an: ["A.这是单选答案答案答案答案答案", "B.这是单选答案答案答案答案答案", "C.这是单选答案答案答案答案答案", "D.这是单选答案答案答案答案答案"],
								anT: "A",
								id: "1"
							}, {
								title: "2.这是单选题目题目题目题目题目",
								an: ["A2.这是单选答案答案答案答案答案", "B.这是单选答案答案答案答案答案", "C.这是单选答案答案答案答案答案", "D.这是单选答案答案答案答案答案"],
								anT: "B",
								id: "2"
							}, {
								title: "3.这是单选题目题目题目题目题目",
								an: ["A.这是单选答案答案答案答案答案", "B.这是单选答案答案答案答案答案", "C.这是单选答案答案答案答案答案", "D.这是单选答案答案答案答案答案", "E.这是单选答案答案答案答案答案", "F.这是单选答案答案答案答案答案", "G.这是单选答案答案答案答案答案", "H.这是单选答案答案答案答案答案"],
								anT: 'G',
								id: "3"
							}
						],
						listDuox: [ //多选题
							{
								title: "1.这是多选题目",
								an: ["A.这是多选答案", "B.这是多选答案", "C.这是多选答案", "D.这是多选答案", "E.这是多选答案", "F.这是多选答案", "G.这是多选答案", "H.这是多选答案"],
								anT: 'A,C,D',
								id: "1"
							}, {
								title: "2.这是多选题目",
								an: ["A.这是多选答案", "B.这是多选答案", "C.这是多选答案", "D.这是多选答案", "E.这是多选答案", "F.这是多选答案", "G.这是多选答案", "H.这是多选答案"],
								anT: 'G,H',
								id: "2"
							}, {
								title: "1.这是多选题目",
								an: ["A.这是多选答案", "B.这是多选答案", "C.这是多选答案", "D.这是多选答案", "E.这是多选答案", "F.这是多选答案", "G.这是多选答案", "H.这是多选答案"],
								anT: 'B,E',
								id: "3"
							}
						],
						listpd: [ //判断题
							{
								title: "1.这是判断题目",
								anT: "正确",
								id: '1'
							}, {
								title: "2.这是判断题题目",
								anT: "错误",
								id: "2"
							}, {
								title: "3.这是判断题题目",
								anT: "错误",
								id: "3"
							}
						],
						listmc: [ //名词解释+简答题
								{
									title: "1.这是名词解释题目",
									anT: "计算机随机事件是计算机随机是计算机计算机是计算机技术还说啥三十岁深红色阿卡寒暑假哈就好寒暑假哈就好哎哎算我思考和撒娇hi文化",
									id: '1'
								}, {
									title: "2.这是名词解释题目",
									anT: "计算机随机事件是计算机随机是计算机计算机是计算机技术还说啥三十岁深红色阿卡寒暑假哈就好寒暑假哈就好哎哎算我思考和撒娇hi文化",
									id: "2"
								}, {
									title: "3.这是名词解释题目",
									anT: "计算机随机事件是计算机随机是计算机计算机是计算机技术还说啥三十岁深红色阿卡寒暑假哈就好寒暑假哈就好哎哎算我思考和撒娇hi文化",
									id: "3"
								}
							],
							listal: [ //案例分析题
							{
								title1:"可口可乐案例分析答案1",
								cnt:"全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1全文1",
								title2: ["1.这是案例分析题目1","2.案例分析题目2","3.案例分析题目3"],
								anT: ["案例答案1","案例答案2","案例答案3"],
								id: '1'
							},
							{
								title1:"可口可乐案例分析答案2",
								cnt:"全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2全文2",
								title2: ["1.这是案例分析题目1-2","2.案例分析题目2-2","3.案例分析题目3-2"],
								anT: ["案例答案1-2","案例答案2-2","案例答案3-2"],
								id: '2'
							},
							{
								title1:"可口可乐案例分析答案3",
								cnt:"全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3全文3",
								title2: ["1.这是案例分析题目1-3","2.案例分析题目2-3","3.案例分析题目3-3"],
								anT: ["案例答案1","案例答案2","案例答案3"],
								id: '3'
							}
						]
							//     			}
					}*/ //模拟数据，需删除
					success:function(data){
					//radio 选中样式class disradio-active
					//checkbox 选中样式class discheck-active
					console.log(data);
				if(data.qType == '1') { //单选题在这里
					$.each(data.listDanx, function(i, item) {
						var _example_an = "";
						var _example_dx = "";
						$.each(item.an, function(j, value) {
							if(value.substring(0, 1) == item.anT) {
								_example_an += '<li>' + '<div class="work-radio">' + '<div class="disradio-active floatL"></div>' + '<div class="radio-text floatL">' + value + '</div>' + '<div class="clear_float"></div>' + '</div>' + '</div>' + '</li>';
							} else {
								_example_an += '<li>' + '<div class="work-radio">' + '<div class="disradio floatL"></div>' + '<div class="radio-text floatL">' + value + '</div>' + '<div class="clear_float"></div>' + '</div>' + '</div>' + '</li>';
							}
						});
						_example_dx = '<ul class="check-radio lineloer-answer1-pro paddingL10">' + '<li class="floatL checkval" data-num="' + item.id + '">' + item.title + '</li>' + '<li class="floatR wauto">' + '<div class="tittleButtonGroup2" style="float: initial;">' + '<a class="btnBg-green look-questions1btn" style="top: 0; width: 80px; margin-right: 30px;">选用</a>' + '</div>' + '</li>' + '<div class="clear_float"></div>' + _example_an + '</ul>';
						$('.exam-box-get').append(_example_dx);
					});

				} else if(data.qType == '2') { //多选题在这里
					$.each(data.listDuox, function(i, item) {
						var _example_an = [];
						var correctAnsArray = item.anT.split(",");
						var _example_duox = "";
						//变成数组存储答案
						$.each(item.an, function(j, value) {
							_example_an.push('<div class="work-radio"><div class="discheck floatL"></div><div class="radio-text floatL">' + value + '</div><div class="clear_float"></div></div>');
						});
						//						循环正确答案
						$.each(_example_an, function(k, group) {
							$.each(correctAnsArray, function(i, val) {
								if(group.indexOf(val) >= 0) {
									_example_an[k] = '<div class="work-radio"><div class="discheck-active floatL"></div><div class="radio-text floatL">' + item.an[k] + '</div><div class="clear_float"></div></div>';
								}
							});
						})
						_example_duox = '<ul class="check-radio lineloer-answer1-pro paddingL10">' +
							'<li class="floatL checkval" data-num="' + item.id + '">' + item.title + '</li>' +
							'<li class="floatR wauto">' +
							'<div class="tittleButtonGroup2" style="float: initial;">' +
							'<a class="btnBg-green look-questions1btn" style="top: 0; width: 80px; margin-right: 30px;">选用</a>' +
							'</div>' +
							'</li>' +
							'<div class="clear_float"></div>' +
							'<li>' +
							'<form method="" action="" class="anntForm-ra paddingT6">' + _example_an.join("") +
							'<input type="hidden" name="anntType" class="anntType" value="" />' +
							'</form>' +
							'</li>' +
							'</ul>';
						$('.exam-box-get').append(_example_duox);
					});
				} else if(data.qType == '3') { //判断题在这里
					$.each(data.listpd, function(i, item) {
						var _example_an = "";
						var _example_pand = "";

						if(item.anT == "正确") {
							_example_an = '<div class="disradio-active  floatL"></div>' +
								'<div class="radio-text floatL" style="margin-right: 16px;">' +
								'正确' +
								'</div>' +
								'<div class="disradio floatL"></div>' +
								'<div class="radio-text floatL">' +
								'错误' +
								'</div>';
						} else {
							_example_an = '<div class="disradio  floatL"></div>' +
								'<div class="radio-text floatL" style="margin-right: 16px;">' +
								'正确' +
								'</div>' +
								'<div class="disradio-active floatL"></div>' +
								'<div class="radio-text floatL">' +
								'错误' +
								'</div>';
						}
						_example_pand = '<ul class="check-radio lineloer-answer1-pro paddingL10">' +
							'<li class="floatL checkval" data-num="' + item.id + '">' + item.title + '</span></li>' +
							'<li class="floatR wauto">' +
							'<div class="tittleButtonGroup2" style="float: initial;">' +
							'<a class="btnBg-green look-questions1btn" style="top: 0; width: 80px; margin-right: 30px;">选用</a>' +
							'</div>' +
							'</li>' +
							'<div class="clear_float"></div>' +
							'<li>' +
							'<form method="" action="" class="anntForm-ra paddingT6">' +
							'<div class="work-radio">' +
							'<div class="floatL">答案：</div>' + _example_an +
							'<div class="clear_float"></div>' +
							'</div>' +
							'<input type="hidden" name="anntType" class="anntType" value="" />' +
							'</form>' +
							'</li>' +
							'</ul>';
						$('.exam-box-get').append(_example_pand);
					});
				} else if(data.qType == '4') { //名词解释题在这里
					$.each(data.listmc, function(i, item) {
						var _example_mc = '<ul class="check-radio lineloer-answer1-pro paddingL10"><li class="floatL checkval" data-num="' + item.id + '">' + item.title + '</span></li><li class="floatR wauto"><div class="tittleButtonGroup2" style="float: initial;"><a class="btnBg-green look-questions1btn" style="top: 0; width: 80px; margin-right: 30px;">选用</a></div></li><div class="clear_float"></div><li><form method="" action="" class="anntForm-ra paddingT6"><div class="work-radio"><div><div class="student font16">答案</div><div class="answer1 width811 marginT10">' + item.anT + '</div></div></div><input type="hidden" name="anntType" class="anntType" value="" /></form></li></ul>';
						$('.exam-box-get').append(_example_mc);
					});
				} else if(data.qType == '5'){//案例分析题在这里
					$.each(data.listal, function(i,item) {
						var _example_t2 = "";
						$.each(item.title2, function(t,t2) {
							_example_t2 += '<h1>'+t2+'</h1><div class="trueTip">参考答案</div><div class="question-case-anwser">'+item.anT[t]+'</div>';
						});
						var _example_al = '<ul class="question-case-box"><li class="question-case-mainTitle checkval" data-num="' + item.id + '"><span class="mainTitleTxt checkval">'+item.title1+'</span><span class="toggleBtn-case toggleBtn-open">展开正文</span><div class="question-chooseBtn question-case-choose btnBg-green">选用</div></li><li class="question-case-cnt"><p>'+item.cnt+'</p></li><li class="exam-case-question">'+_example_t2+'</li></ul>';
						$('.exam-box-get').append(_example_al);
					});
				}

			},
			});

			}
		})
	}

	//点击我的试卷
	// 	$('.paperBtn2').click(function(){
	// 		var _this = $(this);
	// 		var _id = _this.attr('id');
	// //		$.ajax({
	// //			type:"post",
	// //			data:{id:_id},
	// //			dataType:'json',
	// //			url:"",
	// 			var data = {
	// //     			status : "success", //非success则均为错误结果，会忽略body数据
	// //     			message : "",  //自定义错误提示,为空则使用JS默认的提示
	// //     			body : {
	//     				list : [
	//     					{
	// 	       					title : "1.珍硒福-富营养含晒米1", 
	// 	       					an1 : "A.大米礼盒、精品独立包装", 
	// 	       					an2 : "B.大米礼盒、精品独立包装",
	// 	       					an3 : "C.大米礼盒、精品独立包装",
	// 	       					an4 : "D.大米礼盒、精品独立包装",
	// 	       					id : "1"
	//     					},
	//     					{
	// 	       					title : "2.珍硒福-富营养含晒米2", 
	// 	       					an1 : "A.大米礼盒、精品独立包装", 
	// 	       					an2 : "B.大米礼盒、精品独立包装",
	// 	       					an3 : "C.大米礼盒、精品独立包装",
	// 	       					an4 : "D.大米礼盒、精品独立包装",
	// 	       					id : "2"
	//     					},
	//     					{
	// 	       					title : "3.珍硒福-富营养含晒米3", 
	// 	       					an1 : "A.大米礼盒、精品独立包装", 
	// 	       					an2 : "B.大米礼盒、精品独立包装",
	// 	       					an3 : "C.大米礼盒、精品独立包装",
	// 	       					an4 : "D.大米礼盒、精品独立包装",
	// 	       					id : "3"
	//     					}
	//     				]
	// //     			}
	//     		}  //模拟数据，需删除
	// //			success:function(data){
	// 				var _example="";
	// 				$.each(data.list, function(i,item) {
	// 					 _example ='<ul class="check-radio lineloer-answer1-pro paddingL10">'+'<li class="floatL" data-num="'+item.id+'">'+item.title+'</li>'+'<li class="floatR wauto">'+'<div class="tittleButtonGroup2" style="float: initial;">'+'<a class="btnBg-green look-questions1btn" style="top: 0; width: 80px; margin-right: 30px;">选用</a>'+'</div>'+'</li>'+'<div class="clear_float"></div>'+'<li>'+'<div class="work-radio">'+'<div class="disradio floatL"></div>'+'<div class="radio-text floatL">'+item.an1+'</div>'+'<div class="clear_float"></div>'+'</div>'+'<div class="work-radio">'+'<div class="disradio-active floatL"></div>'+'<div class="radio-text floatL">'+item.an2+'</div>'+'<div class="clear_float"></div>'+'</div>'+'<div class="work-radio">'+'<div class="disradio floatL"></div>'+'<div class="radio-text floatL">'+item.an3+'</div>'+'<div class="clear_float"></div>'+'</div>'+'<div class="work-radio">'+'<div class="disradio floatL"></div>'+'<div class="radio-text floatL">'+item.an4+'</div>'+'<div class="clear_float"></div>'+'</div>'+'</li>'+'</ul>';
	// 				$('.exam-box-get').append(_example);
	// 				});
	// //		},
	// //		});
	// 	})
	//	
	//点击选择试题

})