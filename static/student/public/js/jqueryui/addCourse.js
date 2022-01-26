function show(){
	popFadeIn($('#pop_addPer'));
}
//添加课程  添加名额
function addCourse(){
	var key  = $("#addKey").val();         //激活码
	if(key==""){
		alert("请输入课程激活码");
		return false;
	}
	{	// added yasha
		$(".textL").text("操作成功");
		$('.popAlert2').fadeIn();
		$('.popMask2').fadeIn();
		return;
	}
	$.post("_addCourse.txt",{key:key,type:'1'},function(data){
		if(data==1){
			//操作成功弹出提示框
		 	$(".textL").text("操作成功");
			$('.popAlert2').fadeIn();
			$('.popMask2').fadeIn();
		}else{
			//操作失败提示错误信息
			alert(data);
		}
	});
}

//弹出添加作业页面
function addwork(nid,cid){
	$("#nid").val(nid);
	$("#cid").val(cid);
	popFadeIn($('#pop_href'));
}

//跳转到添加页面
function href(type,cid){
	var nid = $("#nid").val();
	var cid = $("#cid").val();
	if(type==1){
		//添加实训
		location.href="teacher-homework-list.htm?type=1&cid="+cid+"&nid="+nid;
	}else{
		//添加作业
		location.href="teacher-homework-list.htm?type=2&cid="+cid+"&nid="+nid;
	}
}


	//加入班级
	function addroom(){
		var number = $("#addKey").text();
		if(number==""){
			number = $("#addKey").val();
			if(number==""){
				alert("请输入班级代码");
				return false;
			}
			
		}
		// updated yasha
		data=1;
		//$.post("_addRoom.txt",{number:number},function(data){
			if(data==1){
				popFadeOut($('#pop_joinCourse'));
				popFadeOut($('#pop_addPer'));
				$("#number").val("");
				alert("提交成功，等待审核");
			}else{
				alert(data);
				popFadeOut($('#pop_joinCourse'));
				popFadeOut($('#pop_addPer'));
			}
		//})
	}


