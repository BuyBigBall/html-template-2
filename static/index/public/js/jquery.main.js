$(function(){

	//公共AJAX参数设置
	cmnAjaxInit();
	
	//inputTip输入框提示
	inputTip();
	
	//返回顶部
	$("#backTop").pageTop();
	
	//侧边栏工具条
	// setTimeout(function(){
	// 	floorPos();
	// },100);
	$(window).scroll(function(){
		floorPos();
	})
	
	//锚点定位
	function floorPos(){
		var scrollTop = $(document).scrollTop();
		if(scrollTop >= 300){
			// $("#sideTool").show(function(){
			// 	$(this).stop().animate({"opacity":1},300);
			// })
			$('#sideTool').fadeIn();
		}
		else{
			// $("#sideTool").stop().animate({"opacity":0},300,function(){
			// 	$(this).hide();
			// });
			$('#sideTool').fadeOut();
		}
	}
	
	//首页友情链接滚动
	if($("#indexPartner").length > 0){
		$.scrollItem({listElm:"#indexPartner .scrollList",stopElm:"#indexPartner .scrollPrev, #indexPartner .scrollNext",prevElm:"#indexPartner .scrollPrev",nextElm:"#indexPartner .scrollNext",moveUnit:171,showNum:7,easingAnt:"swing"});
	}


	//选项卡切换
	$("[tabFor]").children().click(function(){
		var _this = $(this);
		_this.tabClass("cur");
		$("#"+_this.parent().attr("tabFor")).children().eq(_this.index()).tabClass("cur");
	})
	
	//弹出层toggle
	$("[popFor]").click(function(){
		var _this = $(this);
		if(_this.hasClass("disabled")){
			return false;
		}
		var id = _this.attr("popFor");
		var popElm = $("#"+id);
		popElm.css("display","block");
		var marginTop = -popElm.find(".popBox").height()/2;
		popElm.find(".popBox").css("margin-top",marginTop);
	})
	$(".popMask, .popClose").click(function(){
		$(this).parents(".pop").hide();
	})
	
	//类型条件选择
	$('#typeCur').click(function(){
		$("#typeSelect").toggle();
		$(this).toggleClass("slidedown");
	})
	$('#typeSelect>li').click(function(){
		var _this = $(this);
		$("#searchType").val(_this.data("val"));
		if(_this.data("val")==2){
			//搜索教材
			$("#_d").val("textbook");
			$("#_f").val("searchBook");
		}else{
			//搜索资源
			$("#_d").val("resource");
			$("#_f").val("searchResource");
		}
		_this.tabClass("cur");
		$('#typeSelect').hide();
		$('#typeCur').removeClass("slidedown");
		$('#typeCurText').text(_this.text());
		if($(".labelsGroup").length > 0){
			$(".labelsGroup .labels").eq(_this.index()).tabClass("block");
		}
	})

	
	//左侧菜单切换
	$(".menuTabs .tab").click(function(){
		$(".menu").removeClass("cur");
		$(this).parents(".menu").addClass("cur");
	})
	
	//右侧教材推荐slide切换
	$(".rmdList>li").mouseover(function(){
		$(this).tabClass("cur")
	})
	
	//文件上传
	if($(".fileUploader").length > 0){
		$(".fileUploader .fileField").change(function(){
			var _this = $(this);
			var pathArray = _this.val().split("\\");
			var fieldId = _this.attr("for");
			$("#"+fieldId).val(pathArray[pathArray.length-1]);
		})
	}
	
	//整数控件限制
	$("body").delegate("input.inputInt","keydown",function(event){
		var keyCode = event.keyCode;  
	    if((keyCode >= 48 && keyCode <= 57 || keyCode == 8 || keyCode == 37 || keyCode == 39 || keyCode == 116)){ 
	    	if(keyCode == 8 && $(this).val().length <= 1){
	    		return false;   
	    	}
	    } 
	    else{
	    	return false;   
	    }    
	})

	//首页banner切换
	if($(".bnrList").length > 0){
		$.toggleFade({fadeElm:".bnrList>li",crlElm:".bnrCtl>span",prevElm:".bnrPrev",nextElm:".bnrNext",stopElm:".bnrCtl>span",interval:6000,speed:1200});
	}
	//首页教材推荐切换
	if($("#bookNew").length > 0){
		$.toggleFade({fadeElm:"#bookNew .scrollList>li",crlElm:"#bookNew .scrollPagination>span",stopElm:"#bookNew .scrollPagination>span",interval:6000,speed:1200});
	}
	
	//关于我们fullpage滑屏
	if($('#fullpage').length > 0){
		if($(".fullPage_about1").length > 0){
    		var navigationTooltips = ["综合实力","出版团队","企业文化","动力基础","推广网络","联系我们"];
    	}
    	else if($(".fullPage_about3").length > 0){
    		var navigationTooltips = ["教育出版","教育出版","学术出版","联系我们"];
    	}
		$('#fullpage').fullpage({
			anchors: ["slide1", "slide2", "slide3", "slide4", "slide5", "slide6", "slide7"],
			navigation: true,
			//navigationTooltips: navigationTooltips,
			afterRender: function() {
				$("#fp-nav>ul>li").each(function(i,item){
		    		$(item).find("span").text(navigationTooltips[i]);
		    	})
			},
			onLeave: function(index , nextIndex, direction) {
				var curIndex = nextIndex-1;
				if(curIndex >= $("#fullpage .section").length-2){
					$(".downArrow").hide();
				}
				else{
					$(".downArrow").show();
				}
			}
		});
	}
	var _li = $('#fp-nav').find('li').length - 1;
	$('#fp-nav').find('li').eq(_li).addClass('hidefPage');
	
	//表单控件实时验证
	$(".formValidate .validateItem [name]").blur(function(){
		var $this = $(this);
		var $form = $this.parents("form");
		var $wrap = $this.parents(".validateItem");
		var itemVal = $this.val().replace(/\s/g, "");
		if($this.attr("disabled")){
			$wrap.find(".msg").remove();
			return false;
		}
		if($this.data("nulltip")){  //为必填项
			$wrap.find(".msg").remove();
	    	if(itemVal == "" || itemVal == null){
	    		$wrap.append('<div class="msg wrong"><span class="ico sprite"></span><p class="text">'+$this.data("nulltip")+'</p></div>');
	    		return false;
	    	}
	    	else{
	    		$wrap.append('<div class="msg right"><span class="ico sprite"></span></div>');
	    	}
   	 	}
		if($this.data("reg")){  //格式验证
			$wrap.find(".msg").remove();
	    	var reg = $this.data("reg");
        	var re = new RegExp(eval(reg));
	        if (!re.test(itemVal)) {
	        	$wrap.append('<div class="msg wrong"><span class="ico sprite"></span><p class="text">'+$this.data("regtip")+'</p></div>');
	            return false;
	        }
	        else{
	        	$wrap.append('<div class="msg right"><span class="ico sprite"></span></div>');
	        }
    	}
		if($this.data("equal")){  //一致性验证
			$wrap.find(".msg").remove();
	    	var equalOrigin = $this.data("equal");
	    	if (itemVal != $form.find("[equalOrigin="+equalOrigin+"]").val()) {
	    		$wrap.append('<div class="msg wrong"><span class="ico sprite"></span><p class="text">'+$this.data("equaltip")+'</p></div>');
	            return false;
	    	}
	    	else{
	        	$wrap.append('<div class="msg right"><span class="ico sprite"></span></div>');
	    	}
		}
		if($this.attr("equalOrigin")){  //一致性验证
	    	var equalOrigin = $this.attr("equalOrigin");
	    	var equalItem = $form.find("[data-equal="+equalOrigin+"]");
	    	var equalWrap = equalItem.parents(".validateItem");
	    	var equalVal = equalItem.val().replace(/\s/g, "");
	    	if(equalVal != ""){
				equalWrap.find(".msg").remove();
	    		if (itemVal != equalVal) {
		    		equalWrap.append('<div class="msg wrong"><span class="ico sprite"></span><p class="text">'+equalItem.data("equaltip")+'</p></div>');
		            return false;
		    	}
		    	else{
		        	equalWrap.append('<div class="msg right"><span class="ico sprite"></span></div>');
		    	}
	    	}
		}
	})
	$(".formValidate").submit(function(){
		var $form = $(this);
		$form.find(".validateItem [name]").trigger("blur");
		if($form.find(".msg.wrong").length){
			return false;
		}
	});

})

//公共AJAX参数设置
function cmnAjaxInit(){
	$.ajaxSetup({
     	dataType : "json",
     	cache : false,
     	error: function(XMLHttpRequest, textStatus, errorThrown) {
    	 	alert(textStatus);
     	}
	});
}

//inputTip输入框提示
function inputTip(){
	$('.inputWrap .inputField').each(function(){
		$(this).val() != "" ? $(this).siblings(".inputPh").hide() : "";
	})
	$('.inputWrap .inputField, .inputWrap .inputPh').bind('click', function(){
		var parElm = $(this).parent();
		if(parElm.find(".inputPh").length != 0){
			parElm.find(".inputField").focus();
		}
	}).bind('focus', function(){
		var parElm = $(this).parent();
		if(parElm.find(".inputPh").length != 0){
			parElm.find(".inputPh").hide();
		}
	}).bind('blur', function(){
		var _this = $(this);
		if(_this.siblings(".inputPh").length != 0){
			var thisVal = _this.val().replace(/\s/g, "");
			if(thisVal == "" || thisVal == null){
				_this.siblings(".inputPh").show();
			}
		}
	})
}

//通用验证
function checkForm(form){
	var returnVal = true;  //表单是否可提交
    var formElm = $(form);  //验证的当前表单
    var submitItems = formElm.find("[name]").not("[disabled]");  //表单所有提交项

    submitItems.each(function(i,item){
    	if($(item).attr("data-tipNull")){  //为必填项
    		if($(item).attr("type") == "text" || $(item).attr("type") == "password" || $(item).attr("type") == "hidden" || $(item)[0].tagName == "SELECT" || $(item)[0].tagName == "TEXTAREA"){
		    	var itemVal = $(item).val().replace(/\s/g, "");
		    	if(itemVal == "" || itemVal == null){
		    		alert($(item).attr("data-tipNull"));
		    		returnVal = false;
		            return false;
		    	}
		    }
		    if($(item).attr("type") == "radio" || $(item).attr("type") == "checkbox"){
				if(!formElm.find('[name="'+$(item).attr("name")+'"]:checked').val()){
					alert($(item).attr("data-tipNull"));
		    		returnVal = false;
		            return false;
				}
			}
    	}
    	if($(item).attr("data-reg")){  //填写不符合正则规则
    		var itemVal = $(item).val().replace(/\s/g, "");
    		if(itemVal != "" && itemVal != null){
	    		var regu = eval($(item).attr("data-reg"));
		        var re = new RegExp(regu);
		        if (!re.test(itemVal)) {
		            alert($(item).attr("data-tipReg"));
		            returnVal = false;
		            return false;
		        }
	    	}
    	}
    	//两次输入不一致(仅限一个比较项)
    	if(submitItems.filter("[data-same]").length > 0){
	    	var itemSameVal1 = submitItems.filter("[data-same]").eq(0).val().replace(/\s/g, "");
	    	var itemSameVal2 = submitItems.filter("[data-same]").eq(1).val().replace(/\s/g, "");  	
	    	if(itemSameVal1 != "" && itemSameVal2 != "" ){  
	    		if(itemSameVal1 != itemSameVal2){
	    			alert(submitItems.filter("[data-same]").eq(1).attr("data-tipSame"));
	    			returnVal = false;
	    			return false;
	    		}
	    	}
	    }
    }) 

    if(returnVal){
		formElm.find("[type='submit']").attr("disabled","disabled");
	}

    return false;

}