<?php


/**
 * Name: bookmarker
 * Description: Replace #^ with a bookmark icon. Font awesome is used for Redbasic and derived themes. A neutral dark grey PNG file is used for other themes.
 * Version: 1.0
 * Author: Mike Macgirvin <mike@zothub.com>
 * Maintainer: Mike Macgirvin <mike@macgirvin.com>
 * 
 */

function bookmarker_install() {
	register_hook('prepare_body', 'addon/bookmarker/bookmarker.php', 'bookmarker_prepare_body', 10);
}


function bookmarker_uninstall() {
	unregister_hook('prepare_body', 'addon/bookmarker/bookmarker.php', 'bookmarker_prepare_body');
}

function bookmarker_prepare_body(&$a,&$b) {


	if(get_pconfig(local_channel(),'bookmarker','disable'))
		return;

	if(! strpos($b['html'],'bookmark-identifier'))
		return;

	$base_theme = get_app()->theme_info['extends'];
	
	if($base_theme == 'redbasic')
		$bookmarkicon = '<i class="icon-bookmark"></i>';
	else 
		$bookmarkicon = '<img src="addon/bookmarker/bookmarker.png" width="19px" height="20px" alt="#^" />';

	$id = $b['item']['id'];
	if(local_channel())
		$link = '<a class="fakelink" onclick="itemBookmark(' . $id . '); return false;" title="' . t('Save Bookmarks') . '" href="#">'. $bookmarkicon . '</a> ';
	else
		$link =  $bookmarkicon . '</a> ';

	$b['html'] = str_replace('<span class="bookmark-identifier">#^</span>',$link,$b['html']);

}
