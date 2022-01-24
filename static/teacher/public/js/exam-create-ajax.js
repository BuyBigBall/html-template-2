$(function(){


			$('body').delegate('.look-releaseResource','click',function(){
				var num   = $(this).attr("data-num");
				var title = $(this).attr("data-title");
				var id    = $(this).attr("data-id");
				$("#select_data_id").val(id);
				if(num == 1){
					popFadeIn($('#pop_questions_select'));				
					editorMake("containerSA");
					editorMake("containerSB");
					_xthis1 = $(this); 											
				}else if(num == 2){
					popFadeIn($('#pop_questions_check'));
					editorMake("containerCA");
					editorMake("containerCB");
					_xthis2 = $(this); 										
				}else if(num ==3){
					popFadeIn($('#pop_questions_yesno'));
					editorMake("containerPA");
					editorMake("containerPB");	
					_xthis3 = $(this); 											
				}else if(num ==4){
					$(".Explain_data-title").text(title);				
					popFadeIn($('#pop_questions_explain'));					
					editorMake("containerEA");
					// editorMake("containerEB");	
					editorMake("containerEC");	
					_xthis4 = $(this); 										
				}else if(num == 5){
					popFadeIn($('#pop_questions_case1'));					
					editorMake("containerCSA");
					editorMake("containerCSD");	
					editorMake("containerZR0b");
					editorMake("containerZR00a");						
					_xthis7 = $(this);					 					
				}
			})


		//单选题页面动作start			
			//上移 
			$('#panel-select').delegate('.prv-ch', 'click', function() {
				console.log('111');
				
//				//当前p
				var this_input = $(this).parent('td').siblings().find('p');
				var this_val = $.trim(this_input.text());
				console.log(this_val);
//
				//上一INPUT
				var pre_input = $(this).parent('td').parent('tr').prev().find('p');
				var pre_val = $.trim(pre_input.text());
				console.log(pre_val)
//
				//交换值
				this_input.text(pre_val);
				pre_input.text(this_val);
												
//				2017.4.12编辑
//				单选默认选中的样式
				if($(this).parent().prev().find(".workrt-radio").hasClass("on")){
					console.log()
					$(this).parent('td').parent('tr').prev().find('.workrt-radio').addClass("on");
					$(this).parent().prev().find(".workrt-radio").removeClass("on");		
				}
				else if($(this).parent('td').parent('tr').prev().find('.workrt-radio').hasClass("on")){
					$(this).parent('td').parent('tr').prev().find('.workrt-radio').removeClass("on");
					$(this).parent().prev().find(".workrt-radio").addClass("on");		
				}
//				多选默认选中的样式
				if($(this).parent().prev().find("div").hasClass("check-active")){
					if($(this).parent('td').parent('tr').prev().find('div').hasClass("check-active") == false){
						$(this).parent().prev().find("div").removeClass("check-active");
						$(this).parent('td').parent('tr').prev().find('div').addClass("check-active");
					}	
				}
				else if($(this).parent('td').parent('tr').prev().find('div').hasClass("check-active")){
					if($(this).parent().prev().find("div").hasClass("check-active") == false){
						$(this).parent().prev().find("div").addClass("check-active");
						$(this).parent('td').parent('tr').prev().find('div').removeClass("check-active");
					}
				}
//				2017.4.12编辑结束
			});

			//下移 
			$('#panel-select').delegate('.next-ch', 'click', function() {
				
				//当前INPUT
				var this_input = $(this).parent('td').siblings().find('p');
				var this_val = $.trim(this_input.text());

				//下一INPUT
				var next_input = $(this).parent('td').parent('tr').next().find('p');
				var next_val = $.trim(next_input.text());
				//交换值
				this_input.text(next_val);
				next_input.text(this_val);								
				
//				2017.4.12编辑
//				单选默认选中的样式
				if($(this).parent().prev().find(".workrt-radio").hasClass("on")){
					$(this).parent('td').parent('tr').next().find('.workrt-radio').addClass("on");
					$(this).parent().prev().find(".workrt-radio").removeClass("on");		
				}
				else if($(this).parent('td').parent('tr').next().find('.workrt-radio').hasClass("on")){
					$(this).parent('td').parent('tr').next().find('.workrt-radio').removeClass("on");
					$(this).parent().prev().find(".workrt-radio").addClass("on");		
				}
				
				//				多选默认选中的样式
				if($(this).parent().prev().find("div").hasClass("check-active")){
					if($(this).parent('td').parent('tr').next().find('div').hasClass("check-active") == false){
						$(this).parent().prev().find("div").removeClass("check-active");
						$(this).parent('td').parent('tr').next().find('div').addClass("check-active");
					}	
				}
				else if($(this).parent('td').parent('tr').next().find('div').hasClass("check-active")){
					if($(this).parent().prev().find("div").hasClass("check-active") == false){
						$(this).parent().prev().find("div").addClass("check-active");
						$(this).parent('td').parent('tr').next().find('div').removeClass("check-active");
					}
				}
//				2017.4.12编辑结束								
			});			
			//				2017.4.12编辑开始			
			//选项选择有调整  
			$('#panel-select').delegate('.check', 'click', function() {
		    		$(this).addClass('check-active');
		   	});
			//				2017.4.12编辑结束
			
			//选项选择有调整  
			$('#panel-select').delegate('.workrt-radio', 'click', function() {
				$('.workrt-radio').removeClass('on');
		    		$(this).addClass('on');
		   	});

			//内容删除提示
			$('#panel-select').delegate('.look-deleteResource', 'click', function() {
				popFadeIn($('#pop_deleteResource'));
				//需要传递参数  
				var text = $(this).parent().siblings('.exam-option').text();
				$('#pop_deleteResource .Release-delete').attr('data',text);
			});

			$(".add-fu-select").click(function(){
				// alert(123);
				var myString = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
				var i = 0;
				var re = '';
				$("#panel-select tr").each(function(){
					re += $(this).find('td').eq(0).text();
					i++;
				});
				
				if(i > 26){
					alert('选项添加过多');
					return false;
				}

				var newtext = myString.replace(re, "").substring(0,1);
				var str = '<tr class="postDisplay"><td  class="exam-option select-exam-option">'+newtext+'</td><td><p class="ch-a exam-option-an look-option look-option-select"></p></td><td><div class="workrt-radio"></div></td><td class="ch-ch">';				
				console.log(newtext);
				//第一个要过滤掉上移
				if(newtext != 'A'){
					str += '<a class="green prv-ch">上移</a>';
				}

				//倒数第二个要追加下移after
				$("#panel-select tr:last-child td:last-child a.red").before('<a class="green next-ch">下移</a>');
				str += '<a class="red look-deleteResource">删除</a></td></tr>';
				$("#panel-select").append(str);
			});								
				//删除选项A~Z  
			$(".Release-delete").click(function(){
				//alert(123);
				var str = $(this).attr('data');
				var re;
				var myString = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
				$("#panel-select tr").each(function(){
					re = $(this).find('td').eq(0).text();
					//删除当前行
					if(re == str){
						$(this).remove();
					}
				});
				//同时序号再重新排布
				var total = $("#panel-select tr").length;
				$("#panel-select tr").each(function(i){
					var newtext = myString.substring(i-1,i);
					$(this).find('td').eq(0).text(newtext);

					//去除第一个上移的排序
					if(newtext == 'A'){
						var n1 = $(this).find("td:last-child a.green").length;
						if(n1 > 1){
							$(this).find("td:last-child a.green").eq(0).remove();
						}
					}

				});
				//去除第后一个下移的排序
				$("#panel-select tr:last-child td:last-child a.green").eq(1).remove();
				popFadeOut($(".popDeleteBox"));//关闭弹出	
			});
			$(".confirm-select").click(function(){
				var returnData = {
					testType: "",//试题类型
					title:"",//试题题目
					opt:[],//试题选项
					optCon:[],//试题选项内容
					anContext:"",//试题正文
					sonTitle:[],//子试题题目
					sonAns:[],//子试题答案
					sonalyCon:[],//子试题解析
					crtAnt: "",//正确答案
					alyCon:""//解析答案
				};					
				returnData.testType = $("#select_data_id").val();
				//保存单选题目
				// returnData.title = UE.getEditor('containerSA').getContentTxt();
				returnData.title = UE.getEditor('containerSA').getContent();
//						返回选项和选项内容
				$.each($(".select-exam-option"), function(j,val) {
					returnData.opt.push(val.innerHTML);
					returnData.optCon.push($(".look-option-select").eq(j).html());
				});
				//传入正确答案
				$.each($(".workrt-radio"), function(j,val) {
					if($(".workrt-radio").eq(j).hasClass("on")){
						returnData.crtAnt = $(".exam-option").eq(j).html();
						return false;
					}
				});
				//传入解析答案
				// returnData.alyCon =  UE.getEditor('containerSB').getContentTxt();
				returnData.alyCon =  UE.getEditor('containerSB').getContent();	
				var table2 = _xthis1.parents('.conR-con-con1-top').siblings('.conR-con-con1-bottom').find('.table2-1').find('tbody tr');
				var table2Leng =table2.length;
				// console.log(table2Leng);
				$.ajax({
					type: "post",
					url: "source/teacher/ajax/ajax.exam.createquestion.php",
					dataType:'json',
					data:{				
						c   		:returnData.testType,
						title       :returnData.title,
						item        :returnData.opt,
						content     :returnData.optCon,
						anContext   :returnData.anContext,
						answer      :returnData.crtAnt,
						analysis    :returnData.alyCon
					},

					success: function(data) {
						var dat = eval(data);
						if(dat['status']=="fail"){
							alertz1(dat['message']);
							return false;
						}
						
						var trd = $('<tr><td class="tdxuhao"></td><td class="textL dataval paddingL10" data-new="'+dat['id']+'">' + returnData.title + '</td><td><a class="download marginR14 look-questions-t">编辑</a><a class="look-deletebtn colore600">删除</a></td></tr>');				
						_xthis1.parents('.conR-con-con1-top').siblings('.conR-con-con1-bottom').find('.table2-1').find('tbody').append(trd);
						_xthis1.closest('.conR-con-conL').find('.conR-con-con1-bottom').css({
							"display": "block"
						});
						for(var i = 0; i < $('.table2-1 tbody tr').length; i++) {
							_xthis1.parents('.conR-con-con1-top').next().find('.tdxuhao').eq(i).text(i + 1);	
						}
						$.each($("tr"),function(){
							if($(this).hasClass("postDisplay")){
								$(this).remove();
							}
						})
						UE.getEditor('containerSA').setContent(" ");
						UE.getEditor('containerSB').setContent(" ");
						var _conR1 = _xthis1.parents('.conR-con-con1-top');
						 _conR1.find('.checknum').text(_conR1.siblings('.conR-con-con1-bottom').find('.table2-1 tbody tr').length);
						 var checkNum = _conR1.find('.checknum').text();
						_conR1.find(".the-score").text(Math.floor(_conR1.find(".z-score").val() /checkNum));						
					},
					error: function(err) {
						
					}
				});	
								
				// console.log(returnData);	
					
			})
		//单选题页面动作end	

		//多选题页面动作start		
			//上移 
			$('#panel-check').delegate('.prv-ch', 'click', function() {				
//				//当前p
				var this_input = $(this).parent('td').siblings().find('p');
				var this_val = $.trim(this_input.text());
				console.log(this_val);
//
				//上一INPUT
				var pre_input = $(this).parent('td').parent('tr').prev().find('p');
				var pre_val = $.trim(pre_input.text());
				console.log(pre_val)
//
				//交换值
				this_input.text(pre_val);
				pre_input.text(this_val);
								
//				2017.4.12编辑
//				单选默认选中的样式
				if($(this).parent().prev().find(".workrt-radio").hasClass("on")){
					console.log()
					$(this).parent('td').parent('tr').prev().find('.workrt-radio').addClass("on");
					$(this).parent().prev().find(".workrt-radio").removeClass("on");		
				}
				else if($(this).parent('td').parent('tr').prev().find('.workrt-radio').hasClass("on")){
					$(this).parent('td').parent('tr').prev().find('.workrt-radio').removeClass("on");
					$(this).parent().prev().find(".workrt-radio").addClass("on");		
				}
//				多选默认选中的样式
				if($(this).parent().prev().find("div").hasClass("check-active")){
					if($(this).parent('td').parent('tr').prev().find('div').hasClass("check-active") == false){
						$(this).parent().prev().find("div").removeClass("check-active");
						$(this).parent('td').parent('tr').prev().find('div').addClass("check-active");
					}	
				}
				else if($(this).parent('td').parent('tr').prev().find('div').hasClass("check-active")){
					if($(this).parent().prev().find("div").hasClass("check-active") == false){
						$(this).parent().prev().find("div").addClass("check-active");
						$(this).parent('td').parent('tr').prev().find('div').removeClass("check-active");
					}
				}
//				2017.4.12编辑结束
			});

			//下移 
			$('#panel-check').delegate('.next-ch', 'click', function() {				
				//当前INPUT
				var this_input = $(this).parent('td').siblings().find('p');
				var this_val = $.trim(this_input.text());

				//下一INPUT
				var next_input = $(this).parent('td').parent('tr').next().find('p');
				var next_val = $.trim(next_input.text());
				//交换值
				this_input.text(next_val);
				next_input.text(this_val);				
								
//				2017.4.12编辑
//				单选默认选中的样式
				if($(this).parent().prev().find(".workrt-radio").hasClass("on")){
					$(this).parent('td').parent('tr').next().find('.workrt-radio').addClass("on");
					$(this).parent().prev().find(".workrt-radio").removeClass("on");		
				}
				else if($(this).parent('td').parent('tr').next().find('.workrt-radio').hasClass("on")){
					$(this).parent('td').parent('tr').next().find('.workrt-radio').removeClass("on");
					$(this).parent().prev().find(".workrt-radio").addClass("on");		
				}
				
				//				多选默认选中的样式
				if($(this).parent().prev().find("div").hasClass("check-active")){
					if($(this).parent('td').parent('tr').next().find('div').hasClass("check-active") == false){
						$(this).parent().prev().find("div").removeClass("check-active");
						$(this).parent('td').parent('tr').next().find('div').addClass("check-active");
					}	
				}
				else if($(this).parent('td').parent('tr').next().find('div').hasClass("check-active")){
					if($(this).parent().prev().find("div").hasClass("check-active") == false){
						$(this).parent().prev().find("div").addClass("check-active");
						$(this).parent('td').parent('tr').next().find('div').removeClass("check-active");
					}
				}
//				2017.4.12编辑结束	
			});
			
			//				2017.4.12编辑开始					
			//选项选择有调整  
			$('#panel-check').delegate('.check', 'click', function() {
		    		$(this).toggleClass('check-active');
		   	});
			//				2017.4.12编辑结束
			//选项选择有调整  
			$('#panel-check').delegate('.workrt-radio', 'click', function() {
				$('.workrt-radio').removeClass('on');
		    		$(this).addClass('on');
		   	});

			//内容删除提示
			$('#panel-check').delegate('.look-deleteResource', 'click', function() {
				popFadeIn($('#pop_deleteResource'));
				//需要传递参数  
				var text = $(this).parent().siblings('.exam-option').text();
				$('#pop_deleteResource .Release-delete').attr('data',text);
			});

			$(".add-fu-check").click(function(){
				// alert(123);

				var myString = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
				var i = 0;
				var re = '';
				$("#panel-check tr").each(function(){
					re += $(this).find('td').eq(0).text();
					i++;
				});
				
				if(i > 26){
					alert('选项添加过多');
					return false;
				}

				var newtext = myString.replace(re, "").substring(0,1);
				var str = '<tr class="postDisplay"><td  class="ch-ch exam-option check-exam-option">'+newtext+'</td><td><p class="ch-a exam-option-an look-option look-option-check"></p></td><td><div class="check check1"></div></td><td class="ch-ch">';

				//第一个要过滤掉上移
				if(newtext != 'A'){
					str += '<a class="green prv-ch">上移</a>';
				}

				//倒数第二个要追加下移after
				$("#panel-check tr:last-child td:last-child a.red").before('<a class="green next-ch">下移</a>');
				str += '<a class="red look-deleteResource">删除</a></td></tr>';
				$("#panel-check").append(str);
			});
				
				
				//删除选项A~Z  
			$(".Release-delete").click(function(){
				//alert(123);
				var str = $(this).attr('data');
				var re;
				var myString = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

				$("#panel-check tr").each(function(){
					re = $(this).find('td').eq(0).text();
					//删除当前行
					if(re == str){
						$(this).remove();
					}
				});

				//同时序号再重新排布
				var total = $("#panel-check tr").length;
				$("#panel-check tr").each(function(i){

					var newtext = myString.substring(i-1,i);
					$(this).find('td').eq(0).text(newtext);

					//去除第一个上移的排序
					if(newtext == 'A'){
						var n1 = $(this).find("td:last-child a.green").length;
						if(n1 > 1){
							$(this).find("td:last-child a.green").eq(0).remove();
						}
					}

				});

				//去除第后一个下移的排序
				$("#panel-check tr:last-child td:last-child a.green").eq(1).remove();
				popFadeOut($(".popDeleteBox"));//关闭弹出	
			});
			$(".confirm-check").click(function(){
				var returnData = {
					testType: "",//试题类型
					title:"",//试题题目
					opt:[],//试题选项
					optCon:[],//试题选项内容
					anContext:"",//试题正文
					sonTitle:[],//子试题题目
					sonAns:[],//子试题答案
					sonalyCon:[],//子试题解析
					crtAnt: "",//正确答案
					alyCon:""//解析答案
				};					
				returnData.testType = $("#select_data_id").val();
				//保存多选题目
				// returnData.title = UE.getEditor('containerCA').getContentTxt();
				returnData.title = UE.getEditor('containerCA').getContent();
				//						返回选项和选项内容
				$.each($(".check-exam-option "), function(j,val) {
					returnData.opt.push(val.innerHTML);
					returnData.optCon.push($(".look-option-check").eq(j).html());
				});
				//传入正确答案
				// returnData.crtAnt = "";
				$.each($(".check1"), function(j,val) {
					if($(".check1").eq(j).hasClass("check-active")){
						if(returnData.crtAnt == ""){
							returnData.crtAnt = $(".check-exam-option").eq(j).text();
						}else{
							returnData.crtAnt += "," + $(".check-exam-option").eq(j).text();
						}
					}
				});
				//传入解析答案
				// returnData.alyCon = UE.getEditor('containerCB').getContentTxt();
				returnData.alyCon = UE.getEditor('containerCB').getContent();
				var table2 = _xthis2.parents('.conR-con-con1-top').siblings('.conR-con-con1-bottom').find('.table2-1').find('tbody tr');
				var table2Leng =table2.length;
				console.log(returnData);
				// return false;
				$.ajax({
					type: "post",
					url: "source/teacher/ajax/ajax.exam.createquestion.php",
					dataType:'json',
					data:{				
						c   		:returnData.testType,
						title       :returnData.title,
						item        :returnData.opt,
						content     :returnData.optCon,
						anContext   :returnData.anContext,
						answer      :returnData.crtAnt,
						analysis    :returnData.alyCon
					},

					success: function(data) {
						var dat = eval(data);
						if(dat['status']=="fail"){
							alertz2(dat['message']);
							return false;
						}
						var trd = $('<tr><td class="tdxuhao"></td><td class="textL dataval paddingL10" data-new="'+data['id']+'">' + returnData.title + '</td><td><a class="download marginR14 look-questions-t">编辑</a><a class="look-deletebtn colore600">删除</a></td></tr>');				
						_xthis2.parents('.conR-con-con1-top').siblings('.conR-con-con1-bottom').find('.table2-1').find('tbody').append(trd);
						_xthis2.closest('.conR-con-conL').find('.conR-con-con1-bottom').css({
							"display": "block"
						});
						for(var i = 0; i < $('.table2-1 tbody tr').length; i++) {
							_xthis2.parents('.conR-con-con1-top').next().find('.tdxuhao').eq(i).text(i + 1);	
						}
						$.each($("tr"),function(){
							if($(this).hasClass("postDisplay")){
								$(this).remove();
							}
						})
						UE.getEditor('containerCA').setContent(" ");
						UE.getEditor('containerCB').setContent(" ");
						var _conR2 = _xthis2.parents('.conR-con-con1-top');
						 _conR2.find('.checknum').text(_conR2.siblings('.conR-con-con1-bottom').find('.table2-1 tbody tr').length);
						 var checkNum = _conR2.find('.checknum').text();
						_conR2.find(".the-score").text(Math.floor(_conR2.find(".z-score").val() /checkNum));							
					},
					error: function(err) {
						// console.error(err)
					}
				});					

				// console.log(returnData);		
			
			})
		//多选题页面动作end	

		//判断题页面动作start		
			$(".Yes_option-add").delegate(".disradio","click",function (){
				$(".disradio").removeClass("disradio-active");
				$(this).addClass("disradio-active");
			})
			$(".confirm-pand").click(function(){
				var returnData = {
					testType: "",//试题类型
					title:"",//试题题目
					opt:[],//试题选项
					optCon:[],//试题选项内容
					anContext:"",//试题正文
					sonTitle:[],//子试题题目
					sonAns:[],//子试题答案
					sonalyCon:[],//子试题解析
					crtAnt: "",//正确答案
					alyCon:""//解析答案
				};					
				returnData.testType = $("#select_data_id").val();
				//保存判断题目
				// returnData.title = UE.getEditor('containerPA').getContentTxt();
				returnData.title = UE.getEditor('containerPA').getContent();
				//传入正确答案
				$.each($(".Yes_editor .disradio"), function(j,val) {
					if($(".Yes_editor .disradio").eq(j).hasClass("disradio-active")){
						returnData.crtAnt = $(".Yes_radio-text").eq(j).text();
						return false;
					}
				});
				//传入解析答案
				// returnData.alyCon = UE.getEditor('containerPB').getContentTxt();
				returnData.alyCon = UE.getEditor('containerPB').getContent();	
				var table2 = _xthis3.parents('.conR-con-con1-top').siblings('.conR-con-con1-bottom').find('.table2-1').find('tbody tr');
				var table2Leng =table2.length;
				$.ajax({
					type: "post",
					url: "source/teacher/ajax/ajax.exam.createquestion.php",
					dataType:'json',
					data:{				
						c   		:returnData.testType,
						title       :returnData.title,
						item        :returnData.opt,
						content     :returnData.optCon,
						anContext   :returnData.anContext,
						answer      :returnData.crtAnt,
						analysis    :returnData.alyCon
					},

					success: function(data) {
						var dat = eval(data);
						if(dat['status']=="fail"){
							alertz3(dat['message']);
							return false;
						}
						var trd = $('<tr><td class="tdxuhao"></td><td class="textL dataval paddingL10" data-new="'+data['id']+'">' + returnData.title + '</td><td><a class="download marginR14 look-questions-t">编辑</a><a class="look-deletebtn colore600">删除</a></td></tr>');				
						_xthis3.parents('.conR-con-con1-top').siblings('.conR-con-con1-bottom').find('.table2-1').find('tbody').append(trd);
						_xthis3.closest('.conR-con-conL').find('.conR-con-con1-bottom').css({
							"display": "block"
						});
						for(var i = 0; i < $('.table2-1 tbody tr').length; i++) {
							_xthis3.parents('.conR-con-con1-top').next().find('.tdxuhao').eq(i).text(i + 1);	
						}
						UE.getEditor('containerPA').setContent(" ");
						UE.getEditor('containerPB').setContent(" ");
						var _conR3 = _xthis3.parents('.conR-con-con1-top');
						 _conR3.find('.checknum').text(_conR3.siblings('.conR-con-con1-bottom').find('.table2-1 tbody tr').length);
						 var checkNum = _conR3.find('.checknum').text();
						_conR3.find(".the-score").text(Math.floor(_conR3.find(".z-score").val() /checkNum));							
					},
					error: function(err) {
						// console.error(err)
					}
				});					
				
				console.log(returnData);
							
			})
		//判断题页面动作end	

		//名词解释题页面动作start

			$(".confirm-explain").click(function(){
				var returnData = {
					testType: "",//试题类型
					title:"",//试题题目
					opt:[],//试题选项
					optCon:[],//试题选项内容
					anContext:"",//试题正文
					sonTitle:[],//子试题题目
					sonAns:[],//子试题答案
					sonalyCon:[],//子试题解析
					crtAnt: "",//正确答案
					alyCon:""//解析答案
				};					
				returnData.testType = $("#select_data_id").val();
				//保存名词解释题目
				// returnData.title = UE.getEditor('containerEA').getContentTxt();
				returnData.title = UE.getEditor('containerEA').getContent();
				//传入正确答案
				// returnData.crtAnt = UE.getEditor('containerEC').getContentTxt();
				returnData.crtAnt = UE.getEditor('containerEC').getContent();
				//传入解析答案
				// returnData.alyCon = UE.getEditor('containerEB').getContentTxt();
				var table2 = _xthis4.parents('.conR-con-con1-top').siblings('.conR-con-con1-bottom').find('.table2-1').find('tbody tr');
				var table2Leng =table2.length;
				// console.log(table2Leng);
				$.ajax({
					type: "post",
					url: "source/teacher/ajax/ajax.exam.createquestion.php",
					dataType:'json',
					data:{				
						c   		:returnData.testType,
						title       :returnData.title,
						item        :returnData.opt,
						content     :returnData.optCon,
						anContext   :returnData.anContext,
						answer      :returnData.crtAnt,
						analysis    :returnData.alyCon
					},

					success: function(data) {
						var dat = eval(data);
						if(dat['status']=="fail"){
							alertz4(dat['message']);
							return false;
						}
						var trd = $('<tr><td class="tdxuhao"></td><td class="textL dataval paddingL10" data-new="'+dat['id']+'">' + returnData.title + '</td><td><a class="download marginR14 look-questions-t">编辑</a><a class="look-deletebtn colore600">删除</a></td></tr>');				
						_xthis4.parents('.conR-con-con1-top').siblings('.conR-con-con1-bottom').find('.table2-1').find('tbody').append(trd);
						_xthis4.closest('.conR-con-conL').find('.conR-con-con1-bottom').css({
							"display": "block"
						});
						for(var i = 0; i < $('.table2-1 tbody tr').length; i++) {
							_xthis4.parents('.conR-con-con1-top').next().find('.tdxuhao').eq(i).text(i + 1);	
						}
						UE.getEditor('containerEA').setContent(" ");
						// UE.getEditor('containerEB').setContent(" ");
						UE.getEditor('containerEC').setContent(" ");	
						var _conR4 = _xthis4.parents('.conR-con-con1-top');
						 _conR4.find('.checknum').text(_conR4.siblings('.conR-con-con1-bottom').find('.table2-1 tbody tr').length);
						 var checkNum = _conR4.find('.checknum').text();
						_conR4.find(".the-score").text(Math.floor(_conR4.find(".z-score").val() /checkNum));							
					},
					error: function(err) {
						// console.error(err)
					}
				});					
				
				console.log(returnData);
								
			})
		//名词解释题页面动作end									

		//案例分析题页面动作start		
			//添加问题
			var k = 0;
			$(".add-case22").click(function(){
				k++;
				// console.log(123);
				var nnn = $(".case1_son-title").length;
				// console.log(nnn);
				var j = nnn + 1;
				var editor = '<tr class="postDisplay dataNumTr"><td  colspan="2" class="padL27 verT" style="position:relative;"><div class="quesNum quesNumStyle" data-num="'+k+'">问题'+j+'</div><div class="anlDeleteBtn">删除</div></td></tr><tr class="case1_son-title postDisplay0"><td class="padL27 verT">试题子题目：</td><td><div id="containerZR'+ k +'b" name="content" type="text/plain"></div></td></tr><tr class="postDisplay1"><td class="padL27 verT">试题子题目答案：</td><td><div id="containerZR'+ k+k +'a" name="content" type="text/plain"></div></td></tr>';
				$(".lastTr1").before(editor);
				editorMake("containerZR"+k+"b");
				editorMake("containerZR"+k+k+"a");						       		
			});	
			$("#pop_questions_case1").delegate(".anlDeleteBtn","click",function(){
				var idx = $(".anlDeleteBtn").index($(this));
				// console.log(idx+1);
				var _thisFather = $(this).parents(".postDisplay");		
				$(this).parents(".postDisplay").next("tr").next("tr").remove();
				$(this).parents(".postDisplay").next("tr").remove();
				_thisFather.remove();
				$(".dataNumTr td .quesNum").each(function(i){
					var j = i+1;
					$(this).text("问题"+j);
				});
			});
			$(".confirm-case").click(function(){
				var returnData = {
					testType: "",//试题类型
					title:"",//试题题目
					opt:[],//试题选项
					optCon:[],//试题选项内容
					anContext:"",//试题正文
					sonTitle:[],//子试题题目
					sonAns:[],//子试题答案
					sonalyCon:[],//子试题解析
					crtAnt: "",//正确答案
					alyCon:""//解析答案
				};					
				returnData.testType = $("#select_data_id").val();
				//保存判断题目
				// returnData.title = UE.getEditor('containerCSA').getContentTxt();
				returnData.title = UE.getEditor('containerCSA').getContent();
				//传入试题正文
				// returnData.anContext = UE.getEditor('containerCSD').getContentTxt();
				returnData.anContext = UE.getEditor('containerCSD').getContent();
				// $.each($(".case1_son-title"), function(inx) {
				// 	var k = inx + 1;
				// 	returnData.sonTitle.push(UE.getEditor('containerZR'+k+"b").getContentTxt());
				// 	returnData.sonAns.push(UE.getEditor('containerZR'+k+k+"a").getContentTxt());
				// });
				$.each($(".dataNumTr td .quesNum"), function(inx) {
					 var str = $(this).attr("data-num");
					 console.log(str);
					// returnData.sonTitle.push(UE.getEditor('containerZR'+str+"b").getContentTxt());
					returnData.sonTitle.push(UE.getEditor('containerZR'+str+"b").getContent());
					// returnData.sonAns.push(UE.getEditor('containerZR'+str+str+"a").getContentTxt());
					returnData.sonAns.push(UE.getEditor('containerZR'+str+str+"a").getContent());
				});				
				var table2 = _xthis7.parents('.conR-con-con1-top').siblings('.conR-con-con1-bottom').find('.table2-1').find('tbody tr');
				var table2Leng =table2.length;
				console.log(returnData.sonAns);
				$.ajax({
					type: "post",
					url: "source/teacher/ajax/ajax.exam.createquestion.php",
					dataType:'json',
					data:{				
						c   		:returnData.testType,
						title       :returnData.title,
						item        :returnData.sonTitle,
						content     :returnData.sonAns,
						zw          :returnData.anContext,
						answer      :returnData.crtAnt,
						analysis    :returnData.alyCon
					},

					success: function(data) {
						var dat = eval(data);
						if(dat['status']=="fail"){
							alertz5(dat['message']);
							return false;
						}
						var trd = $('<tr><td class="tdxuhao"></td><td class="textL dataval paddingL10" data-new="'+data['id']+'">' + returnData.title + '</td><td><a class="download marginR14 look-questions-t">编辑</a><a class="look-deletebtn colore600">删除</a></td></tr>');				
						_xthis7.parents('.conR-con-con1-top').siblings('.conR-con-con1-bottom').find('.table2-1').find('tbody').append(trd);
						_xthis7.closest('.conR-con-conL').find('.conR-con-con1-bottom').css({
							"display": "block"
						});
						for(var i = 0; i < $('.table2-1 tbody tr').length; i++) {
							_xthis7.parents('.conR-con-con1-top').next().find('.tdxuhao').eq(i).text(i + 1);	
						}
						$.each($(".postDisplay"),function(i){
								$(this).remove();	
						})
						$.each($(".postDisplay td .quesNum"), function(inx) {
							 var str = $(this).attr("data-num");
							 // console.log(str);
							UE.getEditor('containerZR'+str+"b").destroy();
							UE.getEditor('containerZR'+str+str+"a").destroy();
						});				
						$.each($(".postDisplay0"),function(i){
								$(this).remove();	
								// var j = i+1;		
								// UE.getEditor('containerZR'+j+"b").destroy();
						})
						$.each($(".postDisplay1"),function(i){
								$(this).remove();	
								// var j = i+1;		
								// UE.getEditor('containerZR'+j+j+"a").destroy();
						})	

						UE.getEditor('containerCSA').setContent(" ");
						UE.getEditor('containerCSD').setContent(" ");
						UE.getEditor('containerZR0b').setContent(" ");	
						UE.getEditor('containerZR00a').setContent(" ");						
						var _conR7 = _xthis7.parents('.conR-con-con1-top');
						 _conR7.find('.checknum').text(_conR7.siblings('.conR-con-con1-bottom').find('.table2-1 tbody tr').length);
						 var checkNum = _conR7.find('.checknum').text();
						_conR7.find(".the-score").text(Math.floor(_conR7.find(".z-score").val() /checkNum));							
					},
					error: function(err) {
						console.error(err)
					}
				});					
				
				console.log(returnData);
				// $.each($("tr"),function(){
				// 	if($(this).hasClass("postDisplay")){
				// 		$(this).remove();
				// 	}
				// })
												
			})			
			//案例分析题页面动作end	
			function alertz1(msg, url) {
				//只有在考试模块是有下六行代码
				var _d=request("_d");
				if(_d == "examination"){
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
				var yesElm = $('<span />').addClass('popBtn2 againShow1').text('确定').appendTo(alertElm);
				maskElm.show();
				alertElm.show();
				maskElm.add(yesElm).bind('click', function() {
					maskElm.hide(0, function() {
						$(this).remove();
						popFadeIn($('#pop_questions_select'));	
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
			function alertz2(msg, url) {
				//只有在考试模块是有下六行代码
				var _d=request("_d");
				if(_d == "examination"){
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
				var yesElm = $('<span />').addClass('popBtn2 againShow2').text('确定').appendTo(alertElm);
				maskElm.show();
				alertElm.show();
				maskElm.add(yesElm).bind('click', function() {
					maskElm.hide(0, function() {
						$(this).remove();
						popFadeIn($('#pop_questions_check'));	
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
			function alertz3(msg, url) {
				//只有在考试模块是有下六行代码
				var _d=request("_d");
				if(_d == "examination"){
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
				var yesElm = $('<span />').addClass('popBtn2 againShow3').text('确定').appendTo(alertElm);
				maskElm.show();
				alertElm.show();
				maskElm.add(yesElm).bind('click', function() {
					maskElm.hide(0, function() {
						$(this).remove();
						popFadeIn($('#pop_questions_yesno'));	
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
			function alertz4(msg, url) {
				//只有在考试模块是有下六行代码
				var _d=request("_d");
				if(_d == "examination"){
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
				var yesElm = $('<span />').addClass('popBtn2 againShow4').text('确定').appendTo(alertElm);
				maskElm.show();
				alertElm.show();
				maskElm.add(yesElm).bind('click', function() {
					maskElm.hide(0, function() {
						$(this).remove();
						popFadeIn($('#pop_questions_explain'));
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
			function alertz5(msg, url) {
				//只有在考试模块是有下六行代码
				var _d=request("_d");
				if(_d == "examination"){
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
				var yesElm = $('<span />').addClass('popBtn2 againShow5').text('确定').appendTo(alertElm);
				maskElm.show();
				alertElm.show();
				maskElm.add(yesElm).bind('click', function() {
					maskElm.hide(0, function() {
						$(this).remove();
						popFadeIn($('#pop_questions_case1'));	
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
		

	function editorMake(id){
		var ue = UE.getEditor(id,{
					initialFrameWidth:756,
					initialFrameHeight:100,
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
})