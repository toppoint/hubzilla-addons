<div class="openclipatar-ent" id="openclipatar-ent-{{$entry.id}}" >
<div class="openclipatar-img contact-entry-wrapper"><img src="{{$entry.thumb}}" title="{{$entry.dbtext}}" />
<div class="openclipatar-title">{{$entry.title}}</div>
<div class="openclipatar-created">{{$entry.created}}</div>
<div class="openclipatar-ndownloads"><i class="icon-download download-icon"></i> {{$entry.ndownloads}}</div>
<div class="openclipatar-nfaves"><i class="icon-heart heart-icon"></i> {{$entry.nfaves}}</div>
<div class="clear"></div>
</div>
<div class="openclipatar-use btn btn-default"><a href="{{$entry.uselink}}" onclick="grabProfile(this)"><i class="icon-check use-icon"></i> {{$use}}</a></div>
<div class="clear"></div>
</div>
