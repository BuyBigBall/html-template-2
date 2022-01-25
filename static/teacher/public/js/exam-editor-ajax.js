(function (){
	function test(){
		this.index = 0;
//		题型的class名字
		this.typeIndex = "";
//		题型下编辑的下角标
		this.typeNum = 0;
		this.editorIndex = "";
	}

//	编辑试题部分
	test.prototype.editTest = function (v){
		var _thisIndex = this;
		$("table").delegate(".look-questions-t","click",function(){
			var _this = this;
//			获取点击编辑的下角标
			_thisIndex.index = $(this).parents(".conR-con-conL").index();
			_thisIndex.editorIndex = $(this).parents(".marginT11").parent().attr("class").split(" ")[0];
			_thisIndex.typeNum = parseInt($(this).parents("tr").find(".tdxuhao").text()) - 1;
			var index = 1;
			
			var _id = $(_this).parent("td").prev().attr('data-new'); //当前题型默认试卷id
			// console.log(_id);
			$.ajax({
				type:"post",
				data:{id:_id},
				dataType:'json',
				url:"source/teacher/ajax/ajax.exam.editquestion.json",
				success:function(data){
				// console.log(data);
					
					$("#questionType").val(data.qType);
					if(data.qType == '1'){//  单选部分
						// console.log('单选编辑')
						//2017-04-17---2 案例分析 添加选择问题隐藏
						$('.Case_option-add-editor').hide();
						//2017-04-17---2结束
			//			编辑题目的试题类型
						$(".J_data-title").text(data.listDanx['testType']);
			//			编辑题目的试题题目
						UE.getEditor('containerA').setContent(data.listDanx['title']);

						//2017-05-05 隐藏题目
						$('.questionTittleNum').hide()
						//2017-05-05

//						隐藏案例分析添加的元素
						$(".J_context").hide();
//						添加的选项一行出现
						$(".J_option-add").show();
						$(".J_test-option-content").html("");
						$(".J_option").show();
//						隐藏名词解释的editor
						$("#containerC").hide();
						$(".J_editor").find(".add-fu").show();
						$(".J_editor").prev().text('试题选项：');
						if($(".work-radio")){
							$(".work-radio").hide();
						}
//						判断名词解释、简答题、综合分析题中的答案编辑器的存在
						if($("#containerC").length){
							$("#containerC").hide();
						}
//						判断案例解析题假的元素的存在
						if($(".J_add").length){
							$(".J_add").hide();
						}
			//			弹出框添加的答案
						var addAns = "";
						$.each(data.listDanx['opt'], function(j,value) {
							if(data.listDanx['anT'] == value){
								
								
//								2017.4.17编辑-------------修改变量
								addAns += '<tr><td class="exam-option">'+
											value+'</td><td><p class="exam-option-an look-option">'+data.listDanx['an'][j]+'</p></td><td><div class="workrt-radio on"></div></td>';
							}else{
								addAns += '<tr><td class="exam-option">'+
											value+'</td><td><p class="exam-option-an look-option">'+data.listDanx['an'][j]+'</p></td><td><div class="workrt-radio"></div></td>';
							}
//								2017.4.17编辑结束-------------修改变量
							
							
							if(j == 0){
								addAns += '<td class="ch-ch"><a class="green next-ch">下移</a><a class="red look-deleteResource">删除</a></td></tr>';
							}
							else if(j == data.listDanx['an'].length - 1){
								addAns += '<td class="ch-ch"><a class="green prv-ch">上移</a><a class="red look-deleteResource">删除</a></td></tr>';
							}
							else{
								addAns += '<td class="ch-ch"><a class="green prv-ch">上移</a><a class="green next-ch">下移</a><a class="red look-deleteResource">删除</a></td></tr>';
							}
					//						.substring(2);
						});
						$(".J_test-option-content").append(addAns);
						$("#containerB").parent().prev().text("试题解析：");
						$("#containerB").show();
						$("#containerB").parent().prev().show();
						UE.getEditor('containerB').setContent(data.listDanx["analyAns"]);
					}
					else if(data.qType == '2'){// 多选部分
						//2017-04-17---2 案例分析 添加选择问题隐藏
						$('.Case_option-add-editor').hide();
						//2017-04-17---2结束
					//			编辑题目的试题类型
						$(".J_data-title").text(data.listDuox['testType']);
						//			编辑题目的试题题目
						UE.getEditor('containerA').setContent(data.listDuox['title']);

						//2017-05-05 隐藏题目
						$('.questionTittleNum').hide()
						//2017-05-05

						//						隐藏案例分析添加的元素
						$(".J_context").hide();
						//						添加的选项一行出现
						$(".J_option-add").show();
						$(".J_test-option-content").html("");
						$(".J_option").show();
						$(".J_editor").find(".add-fu").show();
						//						隐藏名词解释的editor
						$("#containerC").hide();
						$(".J_editor").prev().text('试题选项：');
						if($(".work-radio")){
							$(".work-radio").hide();
						}
//						判断名词解释、简答题、综合分析题中的答案编辑器的存在
						if($("#containerC").length){
							$("#containerC").hide();
						}
						//						判断案例解析题假的元素的存在
						if($(".J_add").length){
							$(".J_add").hide();
						}
			//			弹出框添加的答案
						var addAns = [];
						var correctAnsArray = data.listDuox['anT'].split(",");
						
//						2017.4.17编辑-----------修改变量
						$.each(data.listDuox['opt'], function(j,value) {
							var examp_an = '<tr><td class="exam-option">'+
											value+'</td><td><p class="exam-option-an look-option">'+data.listDuox['an'][j]+'</p></td><td><div class="check"></div></td>';
							addAns.push(examp_an);							
						});	
						$.each(addAns, function(k,group) {
							$.each(correctAnsArray, function(m, val) {
								if(group.indexOf(val) >= 0) {
									addAns[k] = '<tr><td class="exam-option">'+
													data.listDuox['opt'][k]+'</td><td><p class="exam-option-an look-option">'+data.listDuox['an'][k]+'</p></td><td><div class="check check-active"></div></td>';
									return false;
								}
							});
							
							
//						2017.4.17编辑结束-----------修改变量


							if(k == 0){
								addAns[k] += '<td class="ch-ch"><a class="green next-ch">下移</a><a class="red look-deleteResource">删除</a></td></tr>';
							}
							else if(k == data.listDuox['an'].length - 1){
								addAns[k] += '<td class="ch-ch"><a class="green prv-ch">上移</a><a class="red look-deleteResource">删除</a></td></tr>';
							}
							else{
								addAns[k] += '<td class="ch-ch"><a class="green prv-ch">上移</a><a class="green next-ch">下移</a><a class="red look-deleteResource">删除</a></td></tr>';
							}
					//						.substring(2);
						});
						$(".J_test-option-content").append(addAns.join(""));
						$("#containerB").parent().prev().text("试题解析：");
						$("#containerB").show();
						$("#containerB").parent().prev().show();
						UE.getEditor('containerB').setContent(data.listDuox["analyAns"]);	
					}
					else if(data.qType == '3'){// 判断部分
						//2017-04-17---2 案例分析 添加选择问题隐藏
						$('.Case_option-add-editor').hide();
						//2017-04-17---2结束
					//			编辑题目的试题类型
						$(".J_data-title").text(data.listpd['testType']);
						//			编辑题目的试题题目
						UE.getEditor('containerA').setContent(data.listpd['title']);

						//2017-05-05 隐藏题目
						$('.questionTittleNum').hide()
						//2017-05-05

						//						隐藏案例分析添加的元素
						$(".J_context").hide();
							//						添加的选项一行出现
						$(".J_option-add").show();
						$(".J_option").hide();
						//						隐藏名词解释的editor
						$("#containerC").hide();
						$(".J_editor").find(".add-fu").hide();
						$(".J_editor").prev().text('选择答案：');
//						判断名词解释、简答题、综合分析题中的答案编辑器的存在
						if($("#containerC").length){
							$("#containerC").hide();
						}
						//						判断案例解析题假的元素的存在
						if($(".J_add").length){
							$(".J_add").hide();
						}
						if($(".J_radio-option").length){
							if(data.listpd['anT'] == "正确"){
								$(".J_radio-option").find(".disradio").removeClass("disradio-active");
								$(".J_radio-option").find(".disradio").eq(0).addClass("disradio-active");
							}else{
								$(".J_radio-option").find(".disradio").removeClass("disradio-active");
								$(".J_radio-option").find(".disradio").eq(1).addClass("disradio-active");
							}
						}else{
							var addAns = "";
							if(data.listpd['anT'] == "正确"){
								addAns = '<div class="work-radio mgrT0 J_radio-option"><div class="disradio disradio-active  floatL"></div><div class="radio-text J_radio-text floatL" style="margin-right: 16px;">正确</div><div class="disradio floatL"></div><div class="radio-text J_radio-text floatL">错误</div><div class="clear_float"></div></div>';
							}else{
								addAns = '<div class="work-radio mgrT0 J_radio-option"><div class="disradio  floatL"></div><div class="radio-text J_radio-text floatL" style="margin-right: 16px;">正确</div><div class="disradio disradio-active floatL"></div><div class="radio-text J_radio-text floatL">错误</div><div class="clear_float"></div></div>';
							}
							$(".J_editor").append(addAns);
						}
						$("#containerB").parent().prev().text("试题解析：");
						$("#containerB").show();
						$("#containerB").parent().prev().show();
						UE.getEditor('containerB').setContent(data.listpd["analyAns"]);	
					}
					else if(data.qType == '5'){//案例分析题
						//2017-04-17---2 案例分析 添加选择问题隐藏
						$('.Case_option-add-editor').show();
						//2017-04-17---2结束
						//			编辑题目的试题类型
						$(".J_data-title").text(data.listal['testType']);
						//			编辑题目的试题题目
						UE.getEditor('containerA').setContent(data.listal['title1']);
						//						出现案例分析添加的元素
						$(".J_context").show();
						//						添加的选项一行隐藏
						$(".J_option").hide();
						$(".J_editor").find(".add-fu").hide();
						$(".J_editor").prev().text('试题答案：');
						if($(".work-radio")){
							$(".work-radio").hide();
						}
//						判断名词解释、简答题、综合分析题中的答案编辑器的存在
						if($("#containerC")){
							$("#containerC").hide();
						}
						$(".J_option-add").hide();
						//						判断案例解析题加的元素的存在
						if($(".J_add").length){
							$(".J_add").show();
							UE.getEditor('containerA').setContent(data.listal["title1"]);
							UE.getEditor('containerD').setContent(data.listal["cnt"]);
							$.each(data.listal['title2'], function(j,value) {
								UE.getEditor("container"+j).setContent(value);
								UE.getEditor("container"+j+j).setContent(data.listal['anT'][j]);
								/*if(j < data.listal['title2'].length - 1){
									UE.getEditor("container"+j+j+j).setContent(data.listal['analyAns'][j]);
								}else{
									$("#containerB").parent().prev().text("试题子题目解析：");
									UE.getEditor('containerB').setContent(data.listal['analyAns'][j]);
								}*/
							})
						}else{
							UE.getEditor('containerA').setContent(data.listal["title1"]);
							UE.getEditor('containerD').setContent(data.listal["cnt"]);
							$.each(data.listal['title2'], function(j,value) {
								//增加试题子题目
								var editor = '<tr class="questionTittleNum"><td colspan="2" class="padL27 verT" style="position:relative;"><div class="addQuestionNum">题目'+(j+1)+'</div><div class="J_deleteBtn editorMaskDeleteBtn btnBg-red">删除</div></td></tr><tr class="J_add J_son-title xxxxxx"><td class="padL27 verT">子题目：</td><td><div id="container'+j+'" class="bbbbbb" name="content" type="text/plain"></div></td></tr>';
								$(".J_option-add").before(editor);
								editorInit("container"+j,value);
								//增加试题子题目答案
								editor = '<tr class="J_add J_son-ans"><td class="padL27 verT">子答案：</td><td><div id="container'+j+j+'" name="content" type="text/plain"></div></td></tr>';
								$(".J_option-add").before(editor);
								editorInit("container"+j+j,data.listal['anT'][j]);
								//增加试题子题目解析
								/*if(j < data.listal['title2'].length - 1){
									editor = '<tr class="J_add J_son-aly"><td class="padL27 verT">试题子题目解析：</td><td><div id="container'+j+j+j+'" name="content" type="text/plain"></div></td></tr>';
									$(".J_option-add").before(editor);
									editorInit("container"+j+j+j,data.listal['analyAns'][j]);
								}else{
									$("#containerB").parent().prev().text("试题子题目解析：");
									UE.getEditor('containerB').setContent(data.listal['analyAns'][j]);
								}*/
								$("#containerB").parent().prev().hide();
								$("#containerB").hide();
							})
						}
					}
					else{//名词解释、简答题、综合分析题
						//2017-04-17---2 案例分析 添加选择问题隐藏
						$('.Case_option-add-editor').hide();
						//2017-04-17---2结束
						//			编辑题目的试题类型
						$(".J_data-title").text(data.listmc['testType']);
						//			编辑题目的试题题目
						UE.getEditor('containerA').setContent(data.listmc['title']);

						//2017-05-05 隐藏题目
						$('.questionTittleNum').hide()
						//2017-05-05
						
						//						隐藏案例分析添加的元素
						$(".J_context").hide();
						//						添加的选项一行出现
						$(".J_option-add").show();
						$(".J_option").hide();
						$(".J_editor").find(".add-fu").hide();
						$(".J_editor").prev().text('试题答案：');
						if($(".work-radio")){
							$(".work-radio").hide();
						}
						//						判断案例解析题假的元素的存在
						if($(".J_add").length){
							$(".J_add").hide();
						}
//						判断名词解释、简答题、综合分析题中的答案编辑器的存在
						if($("#containerC").length){
							$("#containerC").show();
							UE.getEditor('containerC').setContent(data.listmc["anT"]);
						}else{
							var editor = '<div id="containerC" name="content" type="text/plain"></div>';
							$(".J_editor").append(editor);
							editorInit("containerC",data.listmc["anT"]);
						}
						/*$("#containerB").parent().prev().text("试题解析：");
						UE.getEditor('containerB').setContent(data.listmc["analyAns"]);*/
						$("#containerB").hide();
						$("#containerB").parent().prev().hide();
					}
//					return false;
				}
			})
		})
	}
	
//2017.4.17编辑开始
	
	var returnData = {
		//题型
		testType:"",
//		题目
		title:"",
//		选项[A,B,C,D]
		opt:[],
//		选项答案[A的答案,B的答案,C答案,D的答案]
		optCon:[],
//		案例分析正文
		anContext:"",
//		案例分析的子题目
		sonTitle:[],
//		案例分析的子题目答案
		sonAns:[],
//		案例分析的子题目答案分析
//		sonalyCon:[],
//      单选题/多选题答案
		crtAnt:"",
//      名词解释等题答案		
		mcAnt:"",
//      判断题答案	
		pdAnt:"",
//      其他题的分析
		alyCon:""
	};
//2017.4.17编辑结束
	
//  确认保存获取数据部分
	test.prototype.confirmData = function(){
		var _this = this;
		$(".alertBtnGroup").delegate(".J_confirm","click",function(){
			var questionType = $("#questionType").val(); 
			if(questionType == "1"){
//				2017.4.17编辑开始 清空返回数据的变量
				returnData = {};
//				2017.4.17编辑结束
				returnData.testType = $(".J_data-title").text();
				//保存单选题目
				$("."+_this.editorIndex).eq(_this.index).find(".textL").eq(_this.typeNum).html(UE.getEditor('containerA').getContent());
				returnData.title = UE.getEditor('containerA').getContent();
//						返回选项和选项内容

//				2017.4.17编辑开始 清空返回数据的变量
				returnData.opt = [];
				returnData.optCon = [];
				//				2017.4.17编辑结束
				
				$.each($(".exam-option"), function(j,val) {
					returnData.opt.push(val.innerHTML);
					returnData.optCon.push($(".look-option").eq(j).html());
				});
				//传入正确答案
				$.each($(".workrt-radio"), function(j,val) {
					if($(".workrt-radio").eq(j).hasClass("on")){
						returnData.crtAnt = $(".exam-option").eq(j).text();
						return false;
					}
				});
				//传入解析答案
				returnData.alyCon =  UE.getEditor('containerB').getContent();
			}
			else if(questionType == "2"){
				//				2017.4.17编辑开始 清空返回数据的变量
				returnData = {};
//				2017.4.17编辑结束
				returnData.testType = $(".J_data-title").text();
				//保存多选题目
				$("."+_this.editorIndex).eq(_this.index).find(".textL").eq(_this.typeNum).html(UE.getEditor('containerA').getContent());
				returnData.title = UE.getEditor('containerA').getContent();
				//						返回选项和选项内容
//				2017.4.17编辑开始 清空返回数据的变量
				returnData.opt = [];
				returnData.optCon = [];
//				2017.4.17编辑结束
				$.each($(".exam-option"), function(j,val) {
					returnData.opt.push(val.innerHTML);
					returnData.optCon.push($(".look-option").eq(j).html());
				});
				//传入正确答案
				returnData.crtAnt = "";
				$.each($(".check"), function(j,val) {
					if($(".check").eq(j).hasClass("check-active")){
						if(returnData.crtAnt == ""){
							returnData.crtAnt = $(".exam-option").eq(j).text();
						}else{
							returnData.crtAnt += "," + $(".exam-option").eq(j).text();
						}
					}
				});
				//传入解析答案
				returnData.alyCon = UE.getEditor('containerB').getContent();
			}
			else if(questionType == "3"){
								//				2017.4.17编辑开始 清空返回数据的变量
				returnData = {};
//				2017.4.17编辑结束
				returnData.testType = $(".J_data-title").text();
				//保存判断题目
				$("."+_this.editorIndex).eq(_this.index).find(".textL").eq(_this.typeNum).html(UE.getEditor('containerA').getContent());
				returnData.title = UE.getEditor('containerA').getContent();
				//传入正确答案
				$.each($(".J_editor .disradio"), function(j,val) {
					if($(".J_editor .disradio").eq(j).hasClass("disradio-active")){
						returnData.pdAnt = $(".J_radio-text").eq(j).text();
						return false;
					}
				});
				//传入解析答案
				returnData.alyCon = UE.getEditor('containerB').getContent();
			}
			else if(questionType == "4"){
								//				2017.4.17编辑开始 清空返回数据的变量
				returnData = {};
//				2017.4.17编辑结束
				returnData.testType = $(".J_data-title").text();
				//保存判断题目
				$("."+_this.editorIndex).eq(_this.index).find(".textL").eq(_this.typeNum).html(UE.getEditor('containerA').getContent());
				returnData.title = UE.getEditor('containerA').getContent();
				//传入正确答案
				returnData.mcAnt = UE.getEditor('containerC').getContent();
				//传入解析答案
				
//				2017.4.17编辑开始
//				此部分显示试题解析
//				returnData.alyCon = UE.getEditor('containerB').getContentTxt();
//				此部分是隐藏试题解析
				$('containerB').hide();
				
//				2017.4.17编辑结束
			}
			else if(questionType == "5"){
								//				2017.4.17编辑开始 清空返回数据的变量
				returnData = {};
//				2017.4.17编辑结束
				returnData.testType = $(".J_data-title").text();
				//保存判断题目
				$("."+_this.editorIndex).eq(_this.index).find(".textL").eq(_this.typeNum).html(UE.getEditor('containerA').getContent());
				returnData.title = UE.getEditor('containerA').getContent();
							//				2017.4.17编辑开始 清空返回数据的变量
				returnData.sonTitle = [];
				returnData.sonAns = [];
//                  returnData.sonalyCon = [];  //试题解析部分
	//				2017.4.17编辑结束

				//传入试题正文
				returnData.anContext = UE.getEditor('containerD').getContent();
				   // console.log(returnData)
				$.each($(".exam-edit-table-t .bbbbbb"), function(j,value) {
					returnData.sonTitle.push(UE.getEditor('container'+j).getContent());
					 returnData.sonAns.push(UE.getEditor('container'+j+j).getContent());
					
//					2017.4.17编辑开始  试题解析部分
//					if(j == $(".J_son-title").length - 1){
//						returnData.sonalyCon.push(UE.getEditor('containerB').getContentTxt());
//					}
//					此部分是试题解析的部分
//					else{
//						returnData.sonalyCon.push(UE.getEditor('container'+j+j+j).getContentTxt());
//					}
//					2017.4.17编辑结束
				})
				if($(".J_AddBtnn").length){
					$.each($(".exam-edit-table-t .zzzzzz"),function(o,value){
						console.log(o);
						console.log(value);
						returnData.sonTitle.push(UE.getEditor('newAddBtn'+o).getContent());
						returnData.sonAns.push(UE.getEditor('newAddBtn'+o+o).getContent());
					});
					
				}

				// console.log(returnData)
			}
			  console.log(returnData);
			 var id = $("."+_this.editorIndex).eq(_this.index).find(".textL").eq(_this.typeNum).attr("data-new");
			$.ajax({
				type:"post",
				data:{
					id:id,
					//题型
					testType:returnData.testType,
					//题目
					title:returnData.title,
					//选项
					opt:returnData.opt,
					//选项的答案
					optCon:returnData.optCon,
					//案例分析题答案
					anContext:returnData.anContext,
					//案例分析子题目
					sonTitle:returnData.sonTitle,
					//案例分析子题目答案
					sonAns:returnData.sonAns,
					//案例分析子题目分析
					sonalyCon:returnData.sonalyCon,
					//选择题正确答案
					crtAnt:returnData.crtAnt,
					//分析题答案
					alyCon:returnData.alyCon,
					//名词解释等题答案
					mcAnt:returnData.mcAnt,
					//判断题答案
					pdAnt:returnData.pdAnt
				},
				dataType:'json',
				url:"source/teacher/ajax/ajax.exam.editsavequestion.json",
				success:function(data){
					console.log(data);
					/*var data = {
						idNew:'666'
					}//模拟数据，需删除*/
					$("."+_this.editorIndex).eq(_this.index).find(".textL").eq(_this.typeNum).attr("data-new",data.idNew);
					
				}
			})
			
			return false;
		})
	}

	var oindex2 = 0;
	//			点击添加按钮
	$(".Case_option-add-editor").delegate(".J_addBtn","click",function(){
		var _questionNum=$('.addQuestionNum').length;
		var editor = '<tr class="questionTittleNum"><td colspan="2" class="padL27 verT" style="position:relative;"><div class="addQuestionNum">题目'+(_questionNum+1)+'</div><div class="J_deleteBtn editorMaskDeleteBtn btnBg-red">删除</div></td></tr><tr class="J_add J_AddBtnn"><td class="padL27 verT">子题目：</td><td><div id="newAddBtn'+oindex2+'" name="content" type="text/plain" class="zzzzzz"></div></td></tr>';
		$(".J_option-add").before(editor);
		editorInit("newAddBtn" + oindex2,"");
		editor = '<tr class="J_add J_AddBtnnAns"><td class="padL27 verT">子答案：</td><td><div id="newAddBtn'+oindex2+oindex2+'" name="content" type="text/plain"></div></td></tr>';
		$(".J_option-add").before(editor);
		editorInit("newAddBtn" + oindex2 + oindex2,"");
		var _this = this ; 
		oindex2 ++ ;
	})
	
	//2017-05-02删除开始
		$("body").delegate(".J_deleteBtn","click",function(){
			var _this = this;
			$(_this).parents("tr").next().next().remove();
			$(_this).parents("tr").next().remove();
			$(_this).parents("tr").remove();
			$(".addQuestionNum").each(function (){
				var index = $(".addQuestionNum").index($(this)) + 1;
				$(this).text("题目" + index);
			})
		})
			//2017-05-02删除结束
	
	var exam =new test();
	exam.editTest();
	exam.confirmData();
	
	
	//保存发布
	$(".button-group3").delegate(".J_store-pub","click",function(){
		
		var score = $("#tpscore").val();
		// console.log(score);
		var all = 0;
		$.each($(".z-score"), function() {
			// console.log($(this).val());
			if($(this).val() != ""){
				all += parseInt($(this).val());	
			}			
		})
		// console.log(all);
		if(all>score){
			alert("各题目分值之和不能大于试卷总分值");
		}else if(all<score){
			alert("各题目分值之和小于试卷总分值")
		}else{
			$.each($(".questions_exam_val"),function (i,item){
				if($(".questions_exam_val").eq(i).parent().next().find(".textL").length){
					var idText = [];
					$.each($(".questions_exam_val").eq(i).parent().next().find(".textL"),function(j,val){
						idText.push($(".questions_exam_val").eq(i).parent().next().find(".textL").eq(j).attr("data-new"));
					})
					$(".questions_exam_val").eq(i).attr("value",idText.join(","));
				}
				 console.log(idText);
			})
			 //$("#paperForm").submit();
			 $("#paperForm").ajaxSubmit({
			 	
				dataType: 'json', //数据格式为json 
				success: function(data) {
					 console.log(data);
					if(data.type==2){
						//注册成功
						location.href=data.url;
					}else if(data.type==1){
						//弹出错误提示
						alert(data.message);
					}
				}, 
				error:function(data){  
					alert("提交失败，请尝试修改后重新提交");
				} 
			}); 		
		}		
		

	})
	//预览
	$(".button-group3").delegate(".J_store-pub_","click",function(){
		$.each($(".questions_exam_val"),function (i,item){
			if($(".questions_exam_val").eq(i).parent().next().find(".textL").length){
				var idText = [];
				$.each($(".questions_exam_val").eq(i).parent().next().find(".textL"),function(j,val){
					idText.push($(".questions_exam_val").eq(i).parent().next().find(".textL").eq(j).attr("data-new"));
				})
				$(".questions_exam_val").eq(i).attr("value",idText.join(","));
			}
			 // console.log(idText);
		})
		 //$("#paperForm").submit();
		 var data = $('#paperForm').serialize();
		 window.open("teacher-examination-preview.htm?"+data); 

	})
	function editorInit(id,val){
		var ue = UE.getEditor(id,{
					initialFrameWidth:756,
					initialFrameHeight:100,
					initialContent:val,
					autoFloatEnabled:false,
					enterTag:'br',
					toolbars: [
					    [
					        'anchor', //锚点
					        'undo', //撤销
					        'redo', //重做
					        'bold', //加粗
					        'indent', //首行缩进
					        'snapscreen', //截图
					        'italic', //斜体
					        'underline', //下划线
					        'strikethrough', //删除线
					        'subscript', //下标
					        'fontborder', //字符边框
					        'superscript', //上标
					        'formatmatch', //格式刷
					        'blockquote', //引用
					        'pasteplain', //纯文本粘贴模式
					        'selectall', //全选
					        'print', //打印
					        'preview', //预览
					        'horizontal', //分隔线
					        'removeformat', //清除格式
					        'time', //时间
					        'date', //日期
					        'unlink', //取消链接
					        'cleardoc', //清空文档
					        'fontfamily', //字体
					        'fontsize', //字号
					        'paragraph', //段落格式
					        'simpleupload', //单图上传
					        'insertimage', //多图上传
					        'edittable', //表格属性
					        'edittd', //单元格属性
					        'link', //超链接
					        'justifyleft', //居左对齐
					        'justifyright', //居右对齐
					        'justifycenter', //居中对齐
					        'justifyjustify', //两端对齐
					        'forecolor', //字体颜色
					        'backcolor', //背景色
					        'rowspacingtop', //段前距
					        'rowspacingbottom', //段后距
					        'imagenone', //默认
					        'attachment', //附件
					        'imagecenter', //居中
					        'lineheight', //行间距
					        'customstyle', //自定义标题
					        'autotypeset', //自动排版
					        'touppercase', //字母大写
					        'tolowercase', //字母小写
					        'background', //背景
					    ]
					]
				});
	}

})();
