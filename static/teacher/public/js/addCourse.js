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
	$.post("_teacher-class-addCourse.txt",{key:key,type:'1'},function(data){
		if(data==1){
			//操作成功弹出提示框
		 	alert("操作成功");
		 	location.reload();
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

