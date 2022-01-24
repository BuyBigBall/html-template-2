$(function(){
				
				//编辑试题弹出层
				$('body').delegate('.look-questions-t','click',function(){
					popFadeIn($('#pop_questions_t'));
				})
				
				
				
				
//				2017.4.12编辑
				$(".J_option-add").delegate(".disradio","click",function (){
					$(".disradio").removeClass("disradio-active");
					$(this).addClass("disradio-active");
				})
//				后编辑开始
//				选项的下标
				var lookOptionIndex = 0; 
				$('body').delegate('.look-option','click',function(){
					lookOptionIndex = $(".look-option").index($(this));
					popFadeIn($('#pop_reUpload'))
					//将选项内容放在编辑器里面
					UE.getEditor('container_editorOption').setContent($(this).html());
					
				})
				//编辑选项内容的发布按钮
				$('.alertBtnGroup').delegate(".J_publish","click",function (){
						$(".look-option").eq(lookOptionIndex).html(UE.getEditor('container_editorOption').getContent());

				})
//				后编辑结束
//				2017.4.12编辑结束



				//上移 
			$('#panel').delegate('.prv-ch', 'click', function() {
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
			$('#panel').delegate('.next-ch', 'click', function() {
				
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
			$('#panel').delegate('.check', 'click', function() {
		    	$(this).addClass('check-active');
		    });
			//				2017.4.12编辑结束
			
			
			
			
			//选项选择有调整  
			$('#panel').delegate('.workrt-radio', 'click', function() {
				$('.workrt-radio').removeClass('on');
		    	$(this).addClass('on');
		    });

			//内容删除提示
			$('#panel').delegate('.look-deleteResource', 'click', function() {
				popFadeIn($('#pop_deleteResource'));
				//需要传递参数  
				var text = $(this).parent().siblings('.exam-option').text();
				$('#pop_deleteResource .Release-delete').attr('data',text);
			});
				
				//弹出层中的添加选项
				$(".add-fu").click(function(){
					var _this = this;
					var myString = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
					var i = 0;
					var re = '';
					$("#panel tr").each(function(){
						re += $(this).find('td').eq(0).text();
						i++;
					});
					
					if(i > 26){
						alert('选项添加过多');
						return false;
					}
	
					var newtext = myString.replace(re, "").substring(0,1);
					var str = '';
					
//					2017.4.17编辑------修改样式
					if($(_this).parents("tbody").find(".J_data-title").text() == "单选题"){
						str = '<tr><td  class="exam-option">'+newtext+'</td><td style="height:43px;"><p class="exam-option-an look-option" style="height:43px;"></p></td><td><div class="workrt-radio"></div></td><td class="ch-ch">';
					}else{
						str = '<tr><td  class="cexam-option">'+newtext+'</td><td style="height:43px;"><p class="exam-option-an look-option" style="height:43px;"></p></td><td><div class="check"></div></td><td class="ch-ch">';
					}
	//					2017.4.17编辑结束------修改样式
					//第一个要过滤掉上移
					if(newtext != 'A'){
						str += '<a class="green prv-ch">上移</a>';
					}
	
					//倒数第二个要追加下移after
					$("#panel tr:last-child td:last-child a.green").after('<a class="green next-ch">下移</a>');
					str += '<a class="red look-deleteResource">删除</a></td></tr>';
					$("#panel").append(str);
	
				});
				
				
				//删除选项A~Z  
			$(".Release-delete").click(function(){

				var str = $(this).attr('data');
				var re;
				var myString = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

				$("#panel tr").each(function(){
					re = $(this).find('td').eq(0).text();
					//删除当前行
					if(re == str){
						$(this).remove();
					}
				});

				//同时序号再重新排布
				var total = $("#panel tr").length;
				$("#panel tr").each(function(i){

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
				$("#panel tr:last-child td:last-child a.green").eq(1).remove();

					popFadeOut($(".popDeleteBox"));//关闭弹出
	
				});
})