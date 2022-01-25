$(function(){
	
	//	内容区导航栏显隐
	// $("#browser").treeview();
	$(".content-left").delegate(".contentL_bottom_nav_tit2", "click", function() {
			// e = e || window.event;
			$('.contentL_bottom_nav_tit2 h1').removeClass('colorfff');
			$('.contentL_bottom_nav_tit2').removeClass('cur-left-nav1');
			$('.contentL_bottom_nav_tit2 h1 i').removeClass('colorfff');
			$(this).parent().siblings().find(".filetree").hide();
			$(this).next().toggle();
			if(!$(this).next('.tabUl').hasClass('disNo')){
				$(this).next('.tabUl').treeview();
			}
			$(this).parent().siblings().find('h1 i').removeClass("fa-caret-up").addClass("fa-sort-desc");
			if($(this).next('.filetree').css("display")=='block'){
				$(this).find('h1 i').removeClass("fa-sort-desc").addClass("fa-caret-up").addClass('colorfff');
				$(this).find('h1').addClass('colorfff');
				$(this).addClass('cur-left-nav1');
			}else{
				$(this).find('h1 i').removeClass("fa-caret-up").addClass("fa-sort-desc");
				$(this).removeClass('cur-left-nav1');
			}
			$(this).next('.tabUl').removeClass("tabUl");
			$(this).next('.tabUl').removeAttr('id');
			// e.stopPropagation ? e.stopPropagation() : (e.cancelBubble=true);
	})
	
	//左侧导航下拉
	$('.contentL_top').click(function(){
		var _this = $(this);
		_this.find('ul').show();
		return false;
	})
	$(document).click(function(){
		$('.contentL_top').find('ul').hide(); 
	})
})