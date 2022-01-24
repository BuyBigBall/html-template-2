$(function(){
	//弹出框_打开
function popFadeIn(pop) {
	pop.show(function() {
		pop.find(".box").css("margin-top", -pop.find(".box").height() / 2);
		$(this).addClass("popFormIn");
		//		$(this).fadeIn()
	})
}
//弹出框_关闭
function popFadeOut(pop) {
	pop.addClass("popFormOut");
	setTimeout(function() {
		pop.removeClass("popFormIn popFormOut").hide();
	}, 200)
}
	//check
	
// 	$('body').delegate('.class-checkBox','click',function(){
// 		var _val="";
// 		var _val2 = "";
// //		var _val;
// 		var _this = $(this).find('.check');
// 		_this.toggleClass('check-active'); 
// 		$('.checkgroup-class .check').each(function(){
// 			var _that = this
// 			if($(_that).attr('class').indexOf('check-active')!=-1){
// 				 _val = _val+$(_that).closest('.class-checkBox').attr('data-classVal')+',';
// 			}
			
// 		})
// 		$('.checkgroup-course .check').each(function(){
// 			var _that = this
// 			if($(_that).attr('class').indexOf('check-active')!=-1){
// 				 _val2 = _val2+$(_that).closest('.class-checkBox').attr('data-classVal')+',';
// 			}
// 		})
// 		_this.closest('.checkgroup-class').find('.choose-val-hide').val(_val)
// 		_this.closest('.checkgroup-course').find('.choose-val-hide').val(_val2)
// 	})
	
	var asd = 0;
	var asd2 = 0;
	var asd3 = 0;
	//左侧导航上下移操作部分脚本
	//鼠标移入右侧
	$('body').delegate('.posiR','mouseover',function(){
//		console.log($(this).parents('.collapsable').find('.posiR').length)
//		console.log($(this).index())
		if($(this).index()==0&&$(this).parents('.collapsable').find('.posiR').length!=1){
//			判断第一个 隐藏上移
			$(this).find('.left-nav-handle').find('.prev-res').hide();
			$(this).find('.left-nav-handle').css({'width':'185px'})
		}else if($(this).index()==$(this).parents('.collapsable').find('.posiR').length-1&&$(this).parents('.collapsable').find('.posiR').length!=1){
			//判断最后一个 隐藏下移
			$(this).find('.left-nav-handle').find('.next-res').hide();
			$(this).find('.left-nav-handle').css({'width':'185px'})
//			console.log(111)
		}else if($(this).index()==0&&$(this).parents('.collapsable').find('.posiR').length==1){
//			alert('只剩一个')
			//判断只剩一个
			$(this).find('.left-nav-handle').find('.next-res').hide();
			$(this).find('.left-nav-handle').find('.prev-res').hide();
			$(this).find('.left-nav-handle').css({'width':'87px'})
		}else{
			$(this).find('.left-nav-handle').find('.prev-res').show();
			$(this).find('.left-nav-handle').find('.next-res').show();
			$(this).find('.left-nav-handle').css({'width':'290px'})
		}
		$(this).find('.left-nav-handle').show();
		asd = 1;
		asd2 = 1;
		asd3 = 1;
	})
	
	$('body').delegate('.posiR','mouseleave',function(){
		$(this).find('.left-nav-handle').hide()
	})
	
	
	//点击上移
	$('.left-nav-handle').delegate('.prev-res','click',function(){
		var _id = $(this).closest('.posiR').attr('id');
		var _id2 = $(this).closest('.posiR').prev('.posiR').attr('id');
		$(this).closest('.posiR').prev().before($(this).closest('.posiR'))
		$(this).closest('.left-nav-handle').hide()
		if(getLink('_d')=="homework"){
			//操作作业模块
			$.post("teacher-homework.htm?act=workUp",{id:_id,nextId:_id2},function(data){
				if(data==1){
					
				}else{
					alert("网络连接错误");
				}
			})

		}else{
			$.post("teacher.php?_d=resource&_f=resource_view&act=resourceUp",{id:_id,nextId:_id2},function(data){
				if(data==1){
					
				}else{
					alert("网络连接错误");
				}
			})
		}
	})
	//点击下移	
	$('.left-nav-handle').delegate('.next-res','click',function(){
		var _id = $(this).closest('.posiR').attr('id');
		var _id2 = $(this).closest('.posiR').next('.posiR').attr('id');
		$(this).closest('.posiR').next().after($(this).closest('.posiR'))
		$(this).closest('.left-nav-handle').hide()
		if(getLink('_d')=="homework"){
			//操作作业模块
			$.post("teacher-homework.htm?act=workUp",{id:_id,nextId:_id2},function(data){
				if(data==1){
					
				}else{
					alert("网络连接错误");
				}
			})

		}else{
			//操作实训模块
			$.post("teacher.php?_d=resource&_f=resource_view&act=resourceUp",{id:_id,nextId:_id2},function(data){
				if(data==1){
					
				}else{
					alert("网络连接错误");
				}
			})
		}
	})
	
// 	var _deleteThis
// 	$('body').delegate('.delete-res','click',function(){
// 		var _id = $(this).closest('.posiR').attr('id');
// 		popFadeIn($('#pop_deleteResource'));
// 		_deleteThis = $(this);
// 		$('.left-nav-handle').hide();
// //		$.ajax({
// //			type:"post",
// //			url:"",
// //			data:{id:_id}
// //			dataType:'json',
// //			success:function(){},
// //			error:function(){}
// //		});
// 	})
	
	// $('.Release-res').click(function(){
	// 	_deleteThis.closest('.posiR').remove();
	// 	popFadeOut($('#pop_deleteResource'))
	// })
	
	//左侧导航上下移操作部分脚本结束
	//左侧导航上下移操作部分脚本
	//鼠标移入右侧
	$('body').delegate('.posiR2','mouseover',function(){
		console.log($(this).parents('.collapsable2').find('.posiR2').length)
//		console.log($(this).index())
		if($(this).index()==0&&$(this).parents('.collapsable2').find('.posiR2').length!=1){
//			判断第一个 隐藏上移
			$(this).find('.left-nav-handle2').find('.prev-res').hide();
			$(this).find('.left-nav-handle2').css({'width':'274px'})
		}else if($(this).index()==$(this).parents('.collapsable2').find('.posiR2').length-1&&$(this).parents('.collapsable2').find('.posiR2').length!=1){
			//判断最后一个 隐藏下移
			$(this).find('.left-nav-handle2').find('.next-res').hide();
			$(this).find('.left-nav-handle2').css({'width':'274px'})
		}else if($(this).index()==0&&$(this).parents('.collapsable2').find('.posiR2').length==1){
//			alert('只剩一个')
			//判断只剩一个
			$(this).find('.left-nav-handle2').find('.next-res').hide();
			$(this).find('.left-nav-handle2').find('.prev-res').hide();
			$(this).find('.left-nav-handle2').css({'width':'182px'})
		}else{
			$(this).find('.left-nav-handle2').find('.prev-res').show();
			$(this).find('.left-nav-handle2').find('.next-res').show();
			$(this).find('.left-nav-handle2').css({'width':'366px'})
		}
		
			asd2 = 1;
			asd3 = 1;
		if(asd>0){
			$('.left-nav-handle2').hide();
			asd = 0;
		}else{
			$(this).find('.left-nav-handle2').show();
		}
	})
	
	$('body').delegate('.posiR2','mouseleave',function(){
		$(this).find('.left-nav-handle2').hide();
		$(this).find('.left-nav-handle2').find('.prev-res').show();
		$(this).find('.left-nav-handle2').find('.next-res').show()
	})
	
	
	//点击上移
	$('.left-nav-handle2').delegate('.prev-res','click',function(){
		var _id = $(this).closest('.posiR2').attr('id');
		var _id2 = $(this).closest('.posiR2').prev('.posiR2').attr('id');
		$(this).closest('.posiR2').prev().before($(this).closest('.posiR2'))
		$(this).closest('.left-nav-handle2').hide()
		$.post("_teacher-resource-move.txt",{id:_id,nextId:_id2},function(data){
			if(!data){
				alert("操作失败");
			}
		})

	})
	//点击下移	
	$('.left-nav-handle2').delegate('.next-res','click',function(){
		var _id = $(this).closest('.posiR2').attr('id');
		var _id2 = $(this).closest('.posiR2').next('.posiR2').attr('id');
		$(this).closest('.posiR2').next().after($(this).closest('.posiR2'))
		$(this).closest('.left-nav-handle2').hide()
		$.post("_teacher-resource-move.txt",{id:_id,nextId:_id2},function(data){
			if(!data){
				alert("操作失败");
			}
		})
	})

	
	var _deleteThis
	$('body').delegate('.delete-res2','click',function(){
		var _id = $(this).closest('.posiR2').attr('id');
		popFadeIn($('#pop_deleteResource'));
		_deleteThis = $(this);
		$('.left-nav-handle2').hide();
	})
	
	$('.Release-res').click(function(){
		_deleteThis.closest('.posiR2').remove();
		popFadeOut($('#pop_deleteResource'))
	})
	
	//左侧导航上下移操作部分脚本结束
	
	
	//左侧导航上下移操作部分脚本
	//鼠标移入右侧
	$('body').delegate('.posiR3','mouseover',function(){
		console.log($(this).parents('.collapsable3').find('.posiR3').length)
		console.log($(this).index())
		if(($(this).index())==0&&$(this).parents('.collapsable3').find('.posiR3').length!=1){
//			判断第一个 隐藏上移
			$(this).find('.left-nav-handle3').find('.prev-res').hide();
			$(this).find('.left-nav-handle3').css({'width':'366px'})
		}else if(($(this).index())==$(this).parents('.collapsable3').find('.posiR3').length-1&&$(this).parents('.collapsable3').find('.posiR3').length!=1){
			//判断最后一个 隐藏下移
			$(this).find('.left-nav-handle3').find('.next-res').hide();
			$(this).find('.left-nav-handle3').css({'width':'366px'})
		}else if(($(this).index())==0&&$(this).parents('.collapsable3').find('.posiR3').length==1){
//			alert('只剩一个')
			//判断只剩一个
			$(this).find('.left-nav-handle3').find('.next-res').hide();
			$(this).find('.left-nav-handle3').find('.prev-res').hide();
			$(this).find('.left-nav-handle3').css({'width':'274px'})
		}else{
			$(this).find('.left-nav-handle3').find('.prev-res').show();
			$(this).find('.left-nav-handle3').find('.next-res').show();
			$(this).find('.left-nav-handle3').css({'width':'490px'})
		}
		
			asd3 = 1;
		if(asd2>0){
			$('.left-nav-handle3').hide();
			asd2 = 0;
		}else{
			$(this).find('.left-nav-handle3').show();
		}
	})
	
	$('body').delegate('.posiR3','mouseleave',function(){
		$(this).find('.left-nav-handle3').hide();
		$(this).find('.left-nav-handle3').find('.prev-res').show();
		$(this).find('.left-nav-handle3').find('.next-res').show()
	})
	
	
	//点击上移
	$('.left-nav-handle3').delegate('.prev-res','click',function(){
		var _id = $(this).closest('.posiR3').attr('id');
		var _id2 = $(this).closest('.posiR3').prev('.posiR3').attr('id');
		$(this).closest('.posiR3').prev().before($(this).closest('.posiR3'))
		$(this).closest('.left-nav-handle3').hide();
		$.post("_teacher-resource-move.txt",{id:_id,nextId:_id2},function(data){
			if(!data){
				alert("操作失败");
			}
		})
		return false;

	})
	//点击下移	
	$('.left-nav-handle3').delegate('.next-res','click',function(){
		var _id = $(this).closest('.posiR3').attr('id');
		var _id2 = $(this).closest('.posiR3').next('.posiR3').attr('id');
		$(this).closest('.posiR3').next().after($(this).closest('.posiR3'))
		$(this).closest('.left-nav-handle3').hide();
		$.post("_teacher-resource-move.txt",{id:_id,nextId:_id2},function(data){
			if(!data){
				alert("操作失败");
			}
		})
		return false;
	})
	
	var _deleteThis
	$('.content-left').delegate('.delete-res3','click',function(){
		console.log(111)
		var _id = $(this).closest('.posiR3').attr('id');
		console.log(_id)
		popFadeIn($('#pop_deleteResource'));
		_deleteThis = $(this);
		$('.left-nav-handle3').hide();
		return false;

	})
	
	$('.Release-res').click(function(){
		_deleteThis.closest('.posiR3').remove();
		popFadeOut($('#pop_deleteResource'));
	})
	
	//左侧导航上下移操作部分脚本结束
	
	
	
	
	//左侧导航上下移操作部分脚本
	//鼠标移入右侧
	$('body').delegate('.posiR4','mouseover',function(){
		console.log($(this).parents('.collapsable4').find('.posiR4').length)
		 console.log($(this).index())
		if(($(this).index())==1&&$(this).parents('.collapsable4').find('.posiR4').length!=2){
//			判断第一个 隐藏上移
			$(this).find('.left-nav-handle4').find('.prev-res').hide();
			$(this).find('.left-nav-handle4').css({'width':'366px'})
		}else if(($(this).index()-1)==$(this).parents('.collapsable4').find('.posiR4').length-2&&$(this).parents('.collapsable4').find('.posiR4').length!=2){
			//判断最后一个 隐藏下移
			$(this).find('.left-nav-handle4').find('.next-res').hide();
			$(this).find('.left-nav-handle4').css({'width':'366px'})
		}else if(($(this).index())==1&&$(this).parents('.collapsable4').find('.posiR4').length==2){
//			alert('只剩一个')
			//判断只剩一个
			$(this).find('.left-nav-handle4').find('.next-res').hide();
			$(this).find('.left-nav-handle4').find('.prev-res').hide();
			$(this).find('.left-nav-handle4').css({'width':'274px'})
		}else{
			$(this).find('.left-nav-handle4').find('.prev-res').show();
			$(this).find('.left-nav-handle4').find('.next-res').show();
			$(this).find('.left-nav-handle4').css({'width':'490px'})
		}
		
			
		if(asd3>0){
			$('.left-nav-handle4').hide();
			asd3 = 0;
		}else{
			$(this).find('.left-nav-handle4').show();
		}
	})
	
	$('body').delegate('.posiR4','mouseleave',function(){
		$(this).find('.left-nav-handle4').hide();
		$(this).find('.left-nav-handle4').find('.prev-res').show();
		$(this).find('.left-nav-handle4').find('.next-res').show();
	})
	
	
	//点击上移
	$('.left-nav-handle4').delegate('.prev-res','click',function(){
		var _id = $(this).closest('.posiR4').attr('id');
		var _id2 = $(this).closest('.posiR4').prev('.posiR4').attr('id');
		$(this).closest('.posiR4').prev().before($(this).closest('.posiR4'))
		$(this).closest('.left-nav-handle4').hide();
		$.post("_teacher-resource-move.txt",{id:_id,nextId:_id2},function(data){
			if(!data){
				alert("操作失败");
			}
		})
		return false;

	})
	//点击下移	
	$('.left-nav-handle4').delegate('.next-res','click',function(){
		var _id = $(this).closest('.posiR4').attr('id');
		var _id2 = $(this).closest('.posiR4').next('.posiR4').attr('id');
		$(this).closest('.posiR4').next().after($(this).closest('.posiR4'))
		$(this).closest('.left-nav-handle4').hide();
		$.post("_teacher-resource-move.txt",{id:_id,nextId:_id2},function(data){
			if(!data){
				alert("操作失败");
			}
		})
		return false;
	})
	
	var _deleteThis
	$('.content-left').delegate('.delete-res4','click',function(){
		console.log(111)
		var _id = $(this).closest('.posiR4').attr('id');
		console.log(_id)
		popFadeIn($('#pop_deleteResource'));
		_deleteThis = $(this);
		$('.left-nav-handle4').hide();
		return false;
//		$.ajax({
//			type:"post",
//			url:"",
//			data:{id:_id}
//			dataType:'json',
//			success:function(){},
//			error:function(){}
//		});
	})
	
	
	
	$('.add-resource').mouseover(function(){
		asd = 1;
		asd2 = 1;
		asd3 = 1;
	})
	
// //	添加
// 	$('body').delegate('.res-res1', 'click', function() {
// 		popFadeIn($('#pop_createClass'));
// 		var _this = $(this);
// 		$('.alertBotmBtnL8').click(function(){
// 			var name = $(this).parents('.rc-changeName-inr').find('.cm-popInput').val();
// //			添加目录名称
// //			$.ajax({
// //				type:"post",
// //				url:"",
// //				data:{name:name},
// //				success:function(){
// //					
// //				},
// //				error:function(){
// //					
// //				}
// //			});
// 		})
// 	})
	
	
// //	编辑
// 	$('body').delegate('.res-res2', 'click', function() {
// 		popFadeIn($('#pop_createClass'));
// 		var _this = $(this);
// 		var dataid = $(this).closest('li').find('.folderL8').attr('id');
		
// 		$('.alertBotmBtnL8').click(function(){
// 			console.log(dataid);
// 			var name = $(this).parents('.rc-changeName-inr').find('.cm-popInput').val();
// 			_this.closest('li').find('.folderL8').text(name);
// 			_this.parents('.collapsable4').find('.folderL9').text(name);
// //			添加目录名称
// //			$.ajax({
// //				type:"post",
// //				url:"",
// //				data:{name:name,dataid:dataid},
// //				success:function(){
// //					
// //				},
// //				error:function(){
// //					
// //				}
// //			});
// 		})
// 	})
	
	// $('.Release-res').click(function(){
	// 	_deleteThis.closest('.posiR4').remove();
	// 	popFadeOut($('#pop_deleteResource'));
	// })
	
	//左侧导航上下移操作部分脚本结束
	$('.cancel ').click(function(){
		$(this).parents('.popForm').hide();
	})
		//获取链接中的参数
	function getLink(name) {
		var reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)', 'i');
		var r = window.location.search.substr(1).match(reg);
		if (r != null) {
			return unescape(r[2]);
		}
		return null;
	}

	  

})