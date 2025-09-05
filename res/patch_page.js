function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

function setTip(obj, text, interactive = false) {
    tippy(obj, {
        content: `<text style="font-size: 11px;">${text}</text>`,
        allowHTML: true,
        placement: 'top',
        theme: 'light vk',
        animation: 'fade',
        interactive: interactive
    });
}

window.showBlueWarning = function (content) {
    NewNotification(tr('warning'), content, null, () => { }, 10000, false);
}

Object.defineProperty(window.player, 'ajCreate', {
    value: function() {},
    writable: false,
    configurable: false
});

window.changeLangPopup = function () {
    window.langPopup = new CMessageBox({
        title: tr('select_language'),
        body: `<a href="/language?lg=ru&hash=${encodeURIComponent(window.router.csrf)}&jReturnTo=${encodeURI(window.location.pathname + window.location.search)}">
<div class="langSelect"><img src="/themepack/vkify16/3.3.1.5/resource/lang_flags/ru.png" style="margin-right: 14px;"><b>Русский</b></div>
</a>
<a href="/language?lg=uk&hash=${encodeURIComponent(window.router.csrf)}&jReturnTo=${encodeURI(window.location.pathname + window.location.search)}">
   <div class="langSelect"><img style="margin-right: 14px;" src="/themepack/vkify16/3.3.1.5/resource/lang_flags/uk.png"><b>Україньска</b></div>
</a>
<a href="/language?lg=en&hash=${encodeURIComponent(window.router.csrf)}&jReturnTo=${encodeURI(window.location.pathname + window.location.search)}">
   <div class="langSelect"><img src="/themepack/vkify16/3.3.1.5/resource/lang_flags/en.png" style="margin-right: 14px;"><b>English</b></div>
</a>
<a href="/language?lg=ru_sov&hash=${encodeURIComponent(window.router.csrf)}&jReturnTo=${encodeURI(window.location.pathname + window.location.search)}">
   <div class="langSelect"><img src="/themepack/vkify16/3.3.1.5/resource/lang_flags/sov.png" style="margin-right: 14px;"><b>Советский</b></div>
</a>
<a href="/language?lg=ru_old&hash=${encodeURIComponent(window.router.csrf)}&jReturnTo=${encodeURI(window.location.pathname + window.location.search)}">
   <div class="langSelect"><img style="margin-right: 14px;" src="/themepack/vkify16/3.3.1.5/resource/lang_flags/imp.png"><b>Дореволюціонный</b></div>
</a>
<a href="/language" onclick="langPopup.close(); allLangsPopup(); return false;">
   <div class="langSelect"><b style="padding: 2px 2px 2px 48px;">All languages »</b></div>
</a>`,
        buttons: [tr('close')],
        callbacks: [() => { langPopup.close() }]
    });
}

window.allLangsPopup = function () {
    const container = document.createElement("div");
    let ul;
    Object.entries(window.openvk.locales).forEach(([langCode, nativeName], index) => {
        if (index % 26 === 0) {
            ul = document.createElement("ul");
            container.appendChild(ul);
        }
        const li = document.createElement("li");
        const link = document.createElement("a");
        link.href = `/language?lg=${langCode}&hash=${encodeURIComponent(window.router.csrf)}&jReturnTo=${encodeURI(window.location.pathname + window.location.search)}`;
        link.textContent = nativeName;
        li.appendChild(link);
        ul.appendChild(li);
    });

    window.langPopup = new CMessageBox({
        title: tr('select_language'),
        body: container.innerHTML,
        buttons: [tr('close')],
        callbacks: [() => { langPopup.close() }]
    });
}

async function fetchNotificationsContent() {
    try {
        const response = await fetch('/notifications');
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const notificationsContainer = doc.querySelector('.notifications');

        if (notificationsContainer) {
            return notificationsContainer.innerHTML + `<a href="/notifications" class="top_notify_show_all">${tr('show_more')}</a>`;
        } else {
            return `<div class="no_notifications">${tr('no_data_description')}</div>`;
        }
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        return `<div class="notifications_error">${tr('error')}</div>`;
    }
}

window.initNotificationsPopup = async function() {
    const targetElement = document.querySelector('#top_notify_btn_div');
    const loadingContent = '<div class="notifications_loading"><div class="pr"><div class="pr_bt"></div><div class="pr_bt"></div><div class="pr_bt"></div></div></div>';

    targetElement.addEventListener('click', function(e) { e.preventDefault(); });

    tippy(targetElement, {
        content: loadingContent,
        allowHTML: true,
        trigger: 'click',
        interactive: true,
        placement: 'bottom-start',
        theme: 'light vk notifications',
        maxWidth: 470,
        arrow: false,
        appendTo: 'parent',
        popperOptions: {
            modifiers: [{
                name: 'offset',
                options: {
                    offset: [0, 0]
                }
            }]
        },
        onHidden() {
            document.querySelector('#top_notify_btn').classList.remove('top_nav_btn_active');
        },
        async onShow(instance) {
            document.querySelector('#top_notify_btn').classList.add('top_nav_btn_active');
            document.querySelector('#top_notify_btn').classList.remove('has_notify');
            instance.setContent(loadingContent);
            const freshNotificationsContent = await fetchNotificationsContent();
            instance.setContent(freshNotificationsContent);
        }
    });
}

window.showAudioUploadPopup = function () {
    window.audioUploadPopup = new CMessageBox({
        title: tr('upload_audio'),
        body: `
<div id="upload_container">
            <div id="firstStep">
                <b><a href="javascript:void(0)">${tr('limits')}</a></b>
                <ul>
                    <li>${tr("audio_requirements", 1, 30, 25)}</li>
                    <li>${tr("audio_requirements_2")}</li>
                </ul>
					<div id="audio_upload">
						<input id="audio_input" multiple="" type="file" name="blob" accept="audio/*" style="display:none">
						<input value="${tr('upload_button')}" class="button" type="button" onclick="document.querySelector('#audio_input').click()">
					</div>
				</div>

            <div id="lastStep" style="display:none">
                <div id="lastStepContainers"></div>
                <div id="lastStepButtons" style="text-align: center;margin-top: 10px;">
                    <input class="button" type="button" id="uploadMusicPopup" value="${tr('upload_button')}">
                    <input class="button" type="button" id="backToUpload" onclick="document.querySelector('#audio_input').click()" value="${tr('select_another_file')}">
                </div>
            </div>
        </div>`,
        buttons: [tr('close')],
        callbacks: [() => { audioUploadPopup.close() }]
    });

    setTimeout(() => {
        const script = document.createElement("script");
        script.type = "module";
        script.innerHTML = `
	import * as id3 from "/assets/packages/static/openvk/js/node_modules/id3js/lib/id3.js";

	window.__audio_upload_page = new class {
		files_list = []

		hideFirstPage() {
			u('#firstStep').attr('style', 'display:none')
			u('#lastStep').attr('style', 'display:block;')
		}

		showFirstPage() {
			u('#firstStep').attr('style', 'display:block;')
			u('#lastStep').attr('style', 'display:none')
		}

		async detectTags(blob) {
			const return_params = {
				performer: '',
				name: '',
				genre: '',
				lyrics: '',
				explicit: 0,
				unlisted: 0,
			}

			function fallback() {
				console.info('Tags not found, setting default values.')
				return_params.name = remove_file_format(blob.name)
				return_params.genre = 'Other'
				return_params.performer = tr('track_unknown')
			}

			let tags = null
			try {
				tags = await id3.fromFile(blob)
			} catch(e) {
				console.error(e)
			}

			console.log(tags)
			if(tags != null) {
				console.log("ID" + tags.kind + " detected, setting values...")
				if(tags.title) {
					return_params.name = tags.title
				} else {
					return_params.name = remove_file_format(blob.name)
				}

				if(tags.artist) {
					return_params.performer = tags.artist
				} else {
					return_params.performer = tr('track_unknown')
					// todo: split performer and title from filename
				}

				if(tags.genre != null) {
					if(tags.genre.split(', ').length > 1) {
						const genres = tags.genre.split(', ')

						genres.forEach(genre => {
							if(window.openvk.audio_genres[genre]) {
								return_params.genre = genre;
							}
						})
					} else {
						if(window.openvk.audio_genres.indexOf(tags.genre) != -1) {
							return_params.genre = tags.genre
						} else {
							console.warn("Unknown genre: " + tags.genre)
							return_params.genre = 'Other'
						}
					}
				} else {
					return_params.genre = 'Other'
				}

				if(tags.comments != null)
					return_params.lyrics = tags.comments
			} else {
				fallback()
			}

			return return_params
		}

		async appendFile(appender) 
		{
			appender.info = await this.detectTags(appender.file)
			const audio_index = this.files_list.push(appender) - 1
			this.appendAudioFrame(audio_index)
		}

		appendAudioFrame(audio_index) {
			const audio_element = this.files_list[audio_index]
			if(!audio_element) {
				return
			
			}
			const template = u(\`
			<div class='upload_container_element' data-index="\${audio_index}">
				<div class='upload_container_name'>
					<span>\${ovk_proc_strtr(escapeHtml(audio_element.file.name), 63)}</span>
					<div id="small_remove_button"></div>
				</div>
				<table cellspacing="7" cellpadding="0" border="0" align="center">
					<tbody>
						<tr>
							<td width="120" valign="top"><span class="nobold">\${tr('performer')}:</span></td>
							<td><input value='\${escapeHtml(audio_element.info.performer)}' name="performer" type="text" autocomplete="off" maxlength="80" /></td>
						</tr>
						<tr>
							<td width="120" valign="top"><span class="nobold">\${tr('audio_name')}:</span></td>
							<td><input type="text" value='\${escapeHtml(audio_element.info.name)}' name="name" autocomplete="off" maxlength="80" /></td>
						</tr>
						<tr>
							<td width="120" valign="top"><span class="nobold">\${tr('genre')}:</span></td>
							<td>
								<select name="genre"></select>
							</td>
						</tr>
						<tr>
							<td width="120" valign="top"><span class="nobold">\${tr('lyrics')}:</span></td>
							<td><textarea name="lyrics" style="resize: vertical;max-height: 300px;">\${escapeHtml(audio_element.info.lyrics)}</textarea></td>
						</tr>
						<tr>
							<td width="120" valign="top"></td>
							<td>
								<label style='display:block'><input type="checkbox" name="explicit">\${tr('audios_explicit')}</label>
								<label><input type="checkbox" name="unlisted">\${tr('audios_unlisted')}</label>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			\`)
			window.openvk.audio_genres.forEach(genre => {
				template.find('select').append(\`
					<option \${genre == audio_element.info.genre ? 'selected': ''} value='\${genre}'>\${genre}</option>
				\`)
			})
			u('#lastStep #lastStepContainers').append(template)
		}
	}

	u(\`#audio_upload input\`).on('change', (e) => {
		const files = e.target.files
		if(files.length <= 0) {
			return
		}

		Array.from(files).forEach(async file => {
			let has_duplicates = false
			const appender = {
				'file': file
			}

			if(!file.type.startsWith('audio/')) {
				makeError(tr('only_audios_accepted', escapeHtml(file.name)))
				return
			}

			window.__audio_upload_page.files_list.forEach(el => {
				if(el && file.name == el.file.name) {
					has_duplicates = true
				}
			})

			if(!has_duplicates) {
				window.__audio_upload_page.appendFile(appender)
			}
		})
		window.__audio_upload_page.hideFirstPage()
	})
    `;
        document.querySelector('.ovk-diag-action').appendChild(script);
        document.querySelector('.ovk-diag-action').insertAdjacentHTML('afterbegin', `<a href="/search?section=audios" style="float: left;margin-top: 6px;margin-left: 5px;">${tr('audio_search')}</a>`)
    }, 0);
}

async function loadMoreAudio() {
    if (window.musHtml) {
        window.musHtml.querySelector('.audiosContainer .loadMore').innerHTML = `<div class="pr"><div class="pr_bt"></div><div class="pr_bt"></div><div class="pr_bt"></div></div>`;
        await window.player.loadContext(Number(Math.max(...window.player.context["playedPages"])) + 1, true);
        window.player.dump();
        let parsedaud = parseAudio(true).scrollContainer;
        let tmp = document.createElement('div');
        tmp.innerHTML = parsedaud;
        window.musHtml.querySelectorAll('.scroll_container .scroll_node [data-realid]').forEach(scrollNode => {
            const realId = scrollNode.getAttribute('data-realid');
            tmp.querySelectorAll('.scroll_node [data-realid]').forEach(node => {
                if (node.getAttribute('data-realid') === realId) node.closest('.scroll_node').remove();
            });
        });
        parsedaud = tmp.innerHTML;
        window.musHtml.querySelector('.audiosContainer.audiosSideContainer.audiosPaddingContainer .loadMore_node').outerHTML = parsedaud;

        const loadMoreButton = window.musHtml.querySelector('.loadMore');
        if (loadMoreButton) {
            loadMoreButton.onclick = async function () { await loadMoreAudio(); }
        }

        u(`.audiosContainer .audioEmbed .audioEntry, .audios_padding .audioEmbed`).removeClass('nowPlaying');
        u(`.audiosContainer .audioEmbed[data-realid='${window.player.current_track_id}'] .audioEntry, .audios_padding .audioEmbed[data-realid='${window.player.current_track_id}'] .audioEntry`).addClass('nowPlaying');
    }
}

function cleanUpAudioList() {
    let ldump = localStorage.getItem('audio.lastDump');
    if (ldump) {
        let data = JSON.parse(ldump);
        if (data.tracks && data.tracks.length > 20) {
            data.tracks = data.tracks.slice(-20);
            localStorage.setItem('audio.lastDump', JSON.stringify(data));
            console.log('playlist context cleaned up!');
        }
    }
}

function parseAudio(onlyscnodes = false) {
    cleanUpAudioList();
    const audioDump = localStorage.getItem('audio.lastDump');
    const nothingtemplate = `<div class="vkifytracksplaceholder" style="margin: auto;">
                                <span style="color: var(--muted-text-color);">
                                    ${tr('no_data_description')}
                                </span>
                            </div>`
    if (audioDump) {
        try {
            if (JSON.parse(audioDump)) {
                let adump = JSON.parse(audioDump);
                adump.tracks = Array.from(new Map(adump.tracks.map(track => [track.id, track])).values());
                const scrollContainer = document.createElement('div');
                scrollContainer.classList.add('scroll_container');
                adump.tracks.forEach(track => {
                    const scrollNode = document.createElement('div');
                    scrollNode.classList.add('scroll_node');
                    scrollNode.innerHTML = `
                <div id="audioEmbed-${track.id}" data-realid="${track.id}" data-name="${track.performer} — ${track.name}" data-genre="Other" data-length="${track.length}" data-keys='${JSON.stringify(track.keys)}' data-url="${track.url}" class="audioEmbed ctx_place">
                    <audio class="audio"></audio>
                    <div id="miniplayer" class="audioEntry">
                        <div class="audioEntryWrapper" draggable="true">
                            <div class="playerButton">
                                <div class="playIcon"></div>
                            </div>
                            <div class="status">
                                <div class="mediaInfo noOverflow">
                                    <div class="info">
                                        <strong class="performer">
                                            <a draggable="false" href="/search?section=audios&amp;order=listens&amp;only_performers=on&amp;q=${encodeURIComponent(track.performer)}">${track.performer}</a>
                                        </strong>
                                        —
                                        <span draggable="false" class="title">${track.name}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="mini_timer">
                                <span class="nobold hideOnHover" data-unformatted="${track.length}">${formatTime(track.length)}</span>
                                <div class="buttons">
                                    <div class="report-icon musicIcon" data-id="6690" onclick="tippy.hideAll()"></div>
                                    <div class="remove-icon musicIcon" data-id="${track.id}"></div>
                                    <div class="add-icon-group musicIcon hidden" data-id="${track.id}"></div>
                                </div>
                            </div>
                        </div>
                        <div class="subTracks" draggable="false">
                            <div class="lengthTrackWrapper">
                                <div class="track lengthTrack">
                                    <div class="selectableTrack">
                                        <div class="selectableTrackLoadProgress">
                                            <div class="load_bar"></div>
                                        </div>
                                        <div class="selectableTrackSlider">
                                            <div class="slider"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="volumeTrackWrapper">
                                <div class="track volumeTrack">
                                    <div class="selectableTrack">
                                        <div class="selectableTrackSlider">
                                            <div class="slider"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
                    scrollContainer.appendChild(scrollNode);
                });
                if (scrollContainer.innerHTML) {
                    const hasMorePages = window.player && window.player.context &&
                        window.player.context.playedPages && window.player.context.pagesCount &&
                        Math.max(...window.player.context.playedPages) < window.player.context.pagesCount;

                    if (hasMorePages) {
                        const loadmore = document.createElement('div');
                        loadmore.classList.add('scroll_node');
                        loadmore.classList.add('loadMore_node');
                        loadmore.innerHTML = `<a class="loadMore">${window.vkifylang.loadmore}</a>`
                        scrollContainer.appendChild(loadmore);
                    }

                    if (onlyscnodes) {
                        return { 'scrollContainer': `${scrollContainer.innerHTML}`, 'nowPlayingUrl': adump.context.object.url };
                    } else {
                        return {
                            'scrollContainer': `<div class="audiosContainer audiosSideContainer audiosPaddingContainer">
                        <div class="scroll_container">
                            ${scrollContainer.innerHTML}
                        </div>
                    </div>`, 'nowPlayingUrl': adump.context.object.url
                        };
                    }
                } else {
                    return { 'scrollContainer': nothingtemplate, 'nowPlayingUrl': '' }
                }
            }
        } catch (error) {
            console.error(error)
            return { 'scrollContainer': nothingtemplate, 'nowPlayingUrl': '' }
        }
    } else {
        return { 'scrollContainer': nothingtemplate, 'nowPlayingUrl': '' }
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return { 'scrollContainer': nothingtemplate, 'nowPlayingUrl': '' }
}

const vkfavicon = {
    "fav": "/themepack/vkify16/3.3.1.5/resource/favicon_vk.ico",
	"fav_chat": "/themepack/vkify16/3.3.1.5/resource/fav_chat.ico",
    "playiconnew": "data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAQAQAABMLAAATCwAAAAAAAAAAAACrglzDq4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglzEq4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz///////////+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/////////////////6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP//////////////////////q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz///////////////////////////+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc////////////////////////////q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP//////////////////////q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/////////////////q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc////////////q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglzDq4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglzDAAAvkQAAL/4AADBsAAAw2wAAMUoAADG6AAAyKgAAMpsAADMNAAAzfwAAM/EAADRlAAA02AAANU0AADXCAAA2Nw==",
    "pauseiconnew": "data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAQAQAABMLAAATCwAAAAAAAAAAAACrglzDq4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglzEq4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/////////////////6uCXP+rglz/////////////////q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP////////////////+rglz/q4Jc/////////////////6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/////////////////q4Jc/6uCXP////////////////+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/////////////////6uCXP+rglz/////////////////q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP////////////////+rglz/q4Jc/////////////////6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/////////////////q4Jc/6uCXP////////////////+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/////////////////6uCXP+rglz/////////////////q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP////////////////+rglz/q4Jc/////////////////6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglzDq4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglz/q4Jc/6uCXP+rglzDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="
}

if (window.location.href.includes('im?sel=')) {
    document.querySelector('link[rel="icon"], link[rel="shortcut icon"]').setAttribute("href", vkfavicon["fav_chat"])
}

window.initVKGraffiti = function (event) {
    const writeContainer = u(event.target).closest('#write');

    const iframeContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="${window.location.origin}/themepack/vkify16/3.3.1.5/stylesheet/styles.css">
    <link rel="stylesheet" href="${window.location.origin}/themepack/vkify16/3.3.1.5/resource/vkgraffiti/graffiti.css">
</head>
<body style="background: none">
    <div style="margin: 10px"><a onclick="Graffiti.flushHistory();">${window.vkifylang ? window.vkifylang.graffitiflushhistory : 'Clear'}</a> | <a onclick="Graffiti.backHistory();">${window.vkifylang ? window.vkifylang.graffitibackhistory : 'Undo'}</a></div>
    <div style="background-color: #F7F7F7; padding-top: 20px; padding-bottom: 1px;">
        <div id="graffiti_aligner">
            <canvas id="graffiti_common" width="586" height="350"></canvas>
            <canvas id="graffiti_overlay" width="586" height="350"></canvas>
            <canvas id="graffiti_helper" width="586" height="350"></canvas>
        </div>
        <div id="graffiti_resizer" style="margin-top: 5px;"></div>
    </div>
    <div>
        <canvas id="graffiti_controls" width="586" height="70"></canvas>
    </div>
    <canvas id="graffiti_hist_helper" width="1172" height="350" style="display:none;"></canvas>
    <div id="graffiti_cpwrap" style="display:none; top:-210px;">
        <canvas id="graffiti_cpicker" width="252" height="168"></canvas>
    </div>
    <script src="${window.location.origin}/themepack/vkify16/3.3.1.5/resource/vkgraffiti/graffiti.js"></script>
    <script>
        var cur = {"lang": {
            "graffiti_flash_color": "${window.vkifylang ? window.vkifylang.graffiticolor : 'Color:'} ",
            "graffiti_flash_opacity": "${window.vkifylang ? window.vkifylang.graffitiopacity : 'Opacity:'} ",
            "graffiti_flash_thickness": "${window.vkifylang ? window.vkifylang.graffitithickness : 'Thickness:'} ",
            "graffiti_normal_size": "Оконный режим",
            "graffiti_full_screen": "Полноэкранный режим"
        }};
        window.onload = function() {
            Graffiti.init();
        };
    </script>
</body>
</html>
`;

    const escapedIframeContent = iframeContent
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    var msgbox = new CMessageBox({
        title: tr("draw_graffiti"),
        body: `<iframe id="graffiti-iframe" style="width: 100%; height: 100%; border: medium;" srcdoc="${escapedIframeContent}" tabindex="0"></iframe>`,
        close_on_buttons: false,
        warn_on_exit: true,
        buttons: [tr("save"), tr("cancel")],
        callbacks: [function () {
            msgbox.getNode().find('iframe').nodes[0].contentWindow.Graffiti.getImage(function (dataURL) {
                var blob = dataURLtoBlob(dataURL);
                let fName = "Graffiti-" + Math.ceil(performance.now()).toString() + ".jpeg";
                let image = new File([blob], fName, {
                    type: "image/jpeg",
                    lastModified: new Date().getTime()
                });
                __uploadToTextarea(image, writeContainer)
            });
            msgbox.close()
        }, async function () {
            const res = await msgbox.__showCloseConfirmationDialog()
            if (res === true) {
                msgbox.close()
            }
        }]
    });

    var msgboxsel = document.querySelector(`.ovk-diag-cont.ovk-msg-all[data-id="${msgbox.id}"]`);
    msgboxsel.style.width = '800px';
    msgbox.getNode().find('.ovk-diag-body').attr('style', 'height:550px;');

    const iframe = msgbox.getNode().find('iframe').nodes[0];

    setTimeout(() => {
        iframe.focus();
    }, 100);

    iframe.addEventListener('click', () => {
        iframe.focus();
    });

    function dataURLtoBlob(dataURL) {
        var arr = dataURL.split(','),
            mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]),
            n = bstr.length,
            u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {
            type: mime
        });
    }
};

window.toggle_comment_textarea = function (id) {
    var el = document.getElementById('commentTextArea' + id);
    var wi = document.getElementById('wall-post-input' + id);
    if (!el.classList.contains("hidden")) {
        el.classList.add("hidden");
        wi.blur();
    } else {
        el.classList.remove("hidden");
        wi.focus();
    }
}

function createLoader() {
    const iconFrames = [
        "data:image/gif;base64,R0lGODlhEAAQAPEDAEVojoSctMHN2QAAACH5BAEAAAMALAAAAAAQABAAAAItnI9pwW0A42rsRTipvVnt7kmDE2LeiaLCeq6C4bbsEHu1e+MvrcM9j/MFU4oCADs=", // prgicon1.gif в Base64
        "data:image/gif;base64,R0lGODlhEAAQAPEDAEVojoSctMHN2QAAACH5BAEAAAMALAAAAAAQABAAAAIrnI9pwm0B42rsRTipvVnt7kmDE2LeiaKkArQg646V1wIZWdf3nMcU30t5CgA7", // prgicon2.gif в Base64
        "data:image/gif;base64,R0lGODlhEAAQAPEDAEVojoSctMHN2QAAACH5BAEAAAMALAAAAAAQABAAAAIxnI9pwr3NHpRuwGivVDsL7nVKBZZmAqRgwBopsLbDGwfuqw7sbs84rOP1fkBh74QoAAA7", // prgicon3.gif в Base64
        "data:image/gif;base64,R0lGODlhEAAQAPEDAEVojoSctMHN2QAAACH5BAEAAAMALAAAAAAQABAAAAItnI9pwG0C42rsRTipvVnt7kmDE2LeiaLBeopr0JpvLBjvPFzyDee6zduIUokCADs=", // prgicon4.gif в Base64
    ];

    let step = 0;
    let timer = null;
    const favicon = document.querySelector('link[rel="icon"]') || document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);

    const updateFavicon = () => {
        step = (step + 1) % 4;
        favicon.href = iconFrames[step];
        timer = setTimeout(updateFavicon, 150);
    };

    const gifFavicon = () => {
        favicon.href = 'data:image/gif;base64,R0lGODlhEAAQAPEDAEVojoSctMHN2QAAACH5BA0KAAMAIf8LTkVUU0NBUEUyLjADAQAAACwAAAAAEAAQAAACLZyPacFtAONq7EU4qb1Z7e5JgxNi3omiwnquguG27BB7tXvjL63DPY/zBVOKAgAh+QQNCgADACwAAAAAEAAQAAACK5yPacJtAeNq7EU4qb1Z7e5JgxNi3omipAK0IOuOldcCGVnX95zHFN9LeQoAIfkEDQoAAwAsAAAAABAAEAAAAjGcj2nCvc0elG7AaK9UOwvudUoFlmYCpGDAGimwtsMbB+6rDuxuzzis4/V+QGHvhCgAACH5BA0KAAMALAAAAAAQABAAAAItnI9pwG0C42rsRTipvVnt7kmDE2LeiaLBeopr0JpvLBjvPFzyDee6zduIUokCADs=';
    };

    return {
        start() {
            document.body.style.cursor = 'progress';
            if (/firefox/i.test(navigator.userAgent.toLowerCase())) {
                gifFavicon();
            } else {
                updateFavicon();
            }
        },
        stop() {
            clearTimeout(timer);
            document.body.style.cursor = 'default';
            favicon.href = 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAQAQAABMLAAATCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKOBYiGjgWKVo4Fi1aOBYt2jgWJxAAAAAKOBYimjgWLUo4Fi76OBYu6jgWLYAAAAAAAAAAAAAAAAAAAAAKOBYlqjgWL3o4Fi/6OBYv+jgWL/o4FiwKOBYhijgWLeo4Fi/6OBYv+jgWL/o4FizAAAAAAAAAAAAAAAAKOBYkujgWL8o4Fi/6OBYv+jgWL/o4Fi/6OBYv+jgWL6o4Fi/6OBYv+jgWL/o4Fi/qOBYlIAAAAAAAAAAKOBYh6jgWLuo4Fi/6OBYv+jgWL/o4Fi/6OBYv+jgWL/o4Fi/6OBYv+jgWL/o4Fi/6OBYocAAAAAAAAAAAAAAACjgWK5o4Fi/6OBYv+jgWL/o4Fi/6OBYv+jgWL/o4Fi/6OBYv+jgWL/o4Fi/6OBYv+jgWIMAAAAAAAAAACjgWJco4Fi/6OBYv+jgWL/o4Fiq6OBYv+jgWL/o4Fi/6OBYv+jgWKyo4Fi/6OBYv+jgWL/o4FiVwAAAACjgWINo4Fi6KOBYv+jgWL/o4FivwAAAACjgWL1o4Fi/6OBYv+jgWL7o4FiB6OBYumjgWL/o4Fi/6OBYuOjgWIJo4FigqOBYv+jgWL/o4Fi/6OBYjqjgWICo4Fi9aOBYv+jgWL/o4Fi+AAAAACjgWKTo4Fi/6OBYv+jgWL/o4FicKOBYvWjgWL/o4Fi/6OBYtwAAAAAo4FiQaOBYv+jgWL/o4Fi/6OBYv4AAAAAo4FiMaOBYv+jgWL/o4Fi/6OBYt6jgWLeo4Fi/6OBYv+jgWKFAAAAAKOBYsijgWL/o4Fi/6OBYu+jgWK9AAAAAAAAAACjgWK6o4Fi/6OBYv+jgWLVAAAAAAAAAACjgWIFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAo4FiAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACDAAAALYAAAAAAADDAgAAAAIAAB7/AAAAAAAA4AAAAP/gAAAAAAAAeAAAAP8AAAD//wAAAB4AAAAAAAAAAA==';
        },
    };
}

window.favloader = createLoader();

$(document).ready(function () {
    let vkdropdownJustClosed = false;
    $(document).on('mousedown', 'select', function (e) {
        e.preventDefault();
    });
    $(document).on('click', 'select', function (e) {
        if (vkdropdownJustClosed) {
            e.preventDefault();
            return;
        }
        if ($('.vkdropdown').length > 0) {
            $('.vkdropdown').remove();
            vkdropdownJustClosed = true;
            setTimeout(() => { vkdropdownJustClosed = false; }, 100);
            e.preventDefault();
            return;
        }
        e.preventDefault();
        showCustomMenu($(this));
    });

    function showCustomMenu($select) {
        $('.vkdropdown').remove();
        const rect = $select[0].getBoundingClientRect();
        const $menu = $('<div class="vkdropdown">')
            .css({
                position: 'absolute',
                left: (rect.left + scrollX - 1) + 'px',
                top: (rect.bottom + scrollY - 2) + 'px',
                width: rect.width + 'px',
                'z-index': 9999,
                'max-height': '200px',
                'overflow-y': 'auto'
            })
            .appendTo('body');

        $select.find('option').each(function () {
            const $option = $(this);
            $('<div class="vkdropopt">')
                .text($option.text())
                .toggleClass('selected', $option.prop('selected'))
                .appendTo($menu);
        });

        $menu.on('click', '.vkdropopt', function () {
            const index = $(this).index();
            $select.find('option').eq(index).prop('selected', true)
            /* jquery для лохов */
            $select[0].dispatchEvent(new Event('change', { bubbles: true }));
            $menu.remove();
        });

        setTimeout(() => {
            $(document).one('click', function (e) {
                if (!$(e.target).closest('.vkdropdown').length && e.target !== $select[0]) {
                    $menu.remove();
                }
            });
        }, 0);
    }
});

window.uiSearch = {
    customConfigs: new Map(),

    init: function(element = null, config = {}) {
        if (element) {
            this.initializeElement(element, config);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                this.bindEvents();
                this.initializeExistingFields();
            });
        }
    },

    initializeElement: function(element, config = {}) {
        const searchContainer = element.closest ? element.closest('.ui_search') :
                              (element.classList && element.classList.contains('ui_search') ? element : null);

        if (!searchContainer) return;

        const elementId = this.getElementId(searchContainer);
        this.customConfigs.set(elementId, {
            onInput: config.onInput || null,
            onChange: config.onChange || null,
            onReset: config.onReset || null,
            onSubmit: config.onSubmit || null,
            onButtonClick: config.onButtonClick || null,
            timeout: config.timeout || 0,
            processQuery: config.processQuery || null,
            ...config
        });

        const input = searchContainer.querySelector('.ui_search_field');
        if (input && input.value && input.value.trim() !== '') {
            searchContainer.classList.remove('ui_search_field_empty');
            this.updateResetButton(searchContainer, input.value.trim());
        }
    },

    getElementId: function(element) {
        if (element.id) return element.id;
        if (element.dataset && element.dataset.searchId) return element.dataset.searchId;

        const input = element.querySelector('.ui_search_field');
        const placeholder = input ? input.placeholder : '';
        const position = Array.from(document.querySelectorAll('.ui_search')).indexOf(element);
        return `ui_search_${position}_${placeholder.replace(/\s+/g, '_')}`;
    },

    bindEvents: function() {
        document.addEventListener('input', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('ui_search_field')) {
                this.handleInputChange(e.target, e);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('ui_search_reset')) {
                this.reset(e.target, false, e);
            } else if (e.target && e.target.classList && e.target.classList.contains('ui_search_button_search')) {
                this.handleButtonClick(e.target, e);
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('ui_search_field')) {
                this.handleChange(e.target, e);
            }
        });

        document.addEventListener('submit', (e) => {
            if (e.target && e.target.closest && e.target.closest('.ui_search')) {
                this.handleSubmit(e);
            }
        });

        document.addEventListener('focus', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('ui_search_field')) {
                this.handleFocus(e.target);
            }
        }, true);

        document.addEventListener('blur', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('ui_search_field')) {
                this.handleBlur(e.target);
            }
        }, true);
    },

    getConfig: function(searchContainer) {
        const elementId = this.getElementId(searchContainer);
        return this.customConfigs.get(elementId) || {};
    },

    handleInputChange: function(input, event) {
        const searchContainer = input.closest('.ui_search');
        if (!searchContainer) return;

        const value = input.value.trim();
        const config = this.getConfig(searchContainer);

        if (value === '') {
            searchContainer.classList.add('ui_search_field_empty');
        } else {
            searchContainer.classList.remove('ui_search_field_empty');
        }

        this.updateResetButton(searchContainer, value);

        if (config.onInput) {
            const processedQuery = config.processQuery ? config.processQuery(value) : value;

            if (config.timeout > 0) {
                if (searchContainer._searchTimeout) {
                    clearTimeout(searchContainer._searchTimeout);
                }

                searchContainer._searchTimeout = setTimeout(() => {
                    config.onInput(processedQuery, input, event);
                }, config.timeout);
            } else {
                config.onInput(processedQuery, input, event);
            }
        }
    },

    handleChange: function(input, event) {
        const searchContainer = input.closest('.ui_search');
        if (!searchContainer) return;

        const config = this.getConfig(searchContainer);
        if (config.onChange) {
            const value = input.value.trim();
            const processedQuery = config.processQuery ? config.processQuery(value) : value;
            config.onChange(processedQuery, input, event);
        }
    },

    handleButtonClick: function(button, event) {
        const searchContainer = button.closest('.ui_search');
        if (!searchContainer) return;

        const config = this.getConfig(searchContainer);
        if (config.onButtonClick) {
            event.preventDefault();
            const input = searchContainer.querySelector('.ui_search_field');
            if (input) {
                const value = input.value.trim();
                const processedQuery = config.processQuery ? config.processQuery(value) : value;
                config.onButtonClick(processedQuery, input, event);
            }
        }
    },

    handleFocus: function(input) {
        const searchContainer = input.closest('.ui_search');
        if (searchContainer) {
            searchContainer.classList.add('ui_search_focused');
        }
    },

    handleBlur: function(input) {
        const searchContainer = input.closest('.ui_search');
        if (searchContainer) {
            searchContainer.classList.remove('ui_search_focused');
        }
    },

    updateResetButton: function(container, value) {
        const resetButton = container.querySelector('.ui_search_reset');
        if (!resetButton) return;

        if (value === '') {
            resetButton.style.visibility = 'hidden';
            resetButton.style.opacity = '0';
        } else {
            resetButton.style.visibility = 'visible';
            resetButton.style.opacity = '0.75';
        }
    },

    reset: function(resetButton, clearFocus = false, event = null) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const searchContainer = resetButton.closest('.ui_search');
        if (!searchContainer) return false;

        const input = searchContainer.querySelector('.ui_search_field');
        if (!input) return false;

        const config = this.getConfig(searchContainer);

        input.value = '';
        searchContainer.classList.add('ui_search_field_empty');
        this.updateResetButton(searchContainer, '');

        if (!clearFocus) {
            input.focus();
        }

        input.dispatchEvent(new Event('input', { bubbles: true }));

        if (config.onReset) {
            config.onReset(input, event);
        }

        return false;
    },

    handleSubmit: function(event) {
        const searchContainer = event.target.closest('.ui_search');
        if (!searchContainer) return true;

        const config = this.getConfig(searchContainer);
        if (config.onSubmit) {
            const input = searchContainer.querySelector('.ui_search_field');
            const result = config.onSubmit(input, event);
            if (result === false) {
                event.preventDefault();
                return false;
            }
        }
        return true;
    },

    initializeExistingFields: function() {
        const searchInputs = document.querySelectorAll('.ui_search_field');
        searchInputs.forEach(input => {
            if (input.value && input.value.trim() !== '') {
                const searchContainer = input.closest('.ui_search');
                if (searchContainer) {
                    searchContainer.classList.remove('ui_search_field_empty');
                    this.updateResetButton(searchContainer, input.value.trim());
                }
            }
        });
    }

};

window.uiSearch.init();

window.initTabSlider = function() {
    const tabContainers = document.querySelectorAll('.ui_tabs');

    tabContainers.forEach(container => {
        const slider = container.querySelector('.ui_tabs_slider');

        if (!slider) return;

        function initSliderPosition() {
            const activeTab = container.querySelector('.ui_tab_sel');
            if (activeTab) {
                moveSliderTo(activeTab);
            }
        }

        function moveSliderTo(tabAnchor) {
            if (!tabAnchor || !slider) return;

            tabAnchor.offsetHeight;

            const { offsetLeft, offsetWidth } = tabAnchor;
            slider.style.transform = `translateX(${offsetLeft}px)`;
            slider.style.width = `${offsetWidth}px`;
        }

        container.addEventListener('click', function(e) {
            const clickedTab = e.target.closest('.ui_tab');
            if (!clickedTab || clickedTab.classList.contains('ui_tab_sel')) return;

            e.preventDefault();

            container.classList.add('ui_tabs_sliding');

            const currentActive = container.querySelector('.ui_tab_sel');
            if (currentActive) {
                currentActive.classList.remove('ui_tab_sel');
            }

            moveSliderTo(clickedTab);

            setTimeout(() => {
                clickedTab.classList.add('ui_tab_sel');

                container.classList.remove('ui_tabs_sliding');

                const href = clickedTab.getAttribute('href');
                if (href) {
                    const fullUrl = new URL(href, window.location.href).href;

                    if (window.router && window.router.route) {
                        window.router.route(fullUrl);
                    } else {
                        window.location.href = fullUrl;
                    }
                }
            }, 200);
        });

        initSliderPosition();

        window.addEventListener('resize', initSliderPosition);
    });
};

document.addEventListener('DOMContentLoaded', window.initTabSlider);

window.addEventListener('DOMContentLoaded', async () => {
    u(document).on('click', `.ovk-diag-body #upload_container #uploadMusicPopup`, async () => {
        const current_upload_page = '/player/upload'
        let end_redir = ''
        u('.ovk-diag-body #lastStepButtons').addClass('lagged')
        for (const elem of u('.ovk-diag-body #lastStepContainers .upload_container_element').nodes) {
            if (!elem) {
                return
            }
            const elem_u = u(elem)
            const index = elem.dataset.index
            const file = window.__audio_upload_page.files_list[index]
            if (!file || !index) {
                return
            }

            elem_u.addClass('lagged').find('.upload_container_name').addClass('uploading')
            const fd = serializeForm(elem)
            fd.append('blob', file.file)
            fd.append('ajax', 1)
            fd.append('hash', window.router.csrf)
            const result = await fetch(current_upload_page, {
                method: 'POST',
                body: fd,
            })
            const result_text = await result.json()
            if (result_text.success) {
                end_redir = result_text.redirect_link
            } else {
                await makeError(escapeHtml(result_text.flash.message))
            }
            await sleep(6000)
            elem_u.remove()
        }
        audioUploadPopup.close();
        router.route(end_redir);
    });

    window.player.__highlightActiveTrack = function () {
        if (!window.player.isAtCurrentContextPage()) {
            if (u(`.tippy-content .audiosContainer .audioEmbed[data-realid='${window.player.current_track_id}']`).length > 0) {
                u(`.tippy-content .audiosContainer .audioEmbed[data-realid='${window.player.current_track_id}'] .audioEntry, .audios_padding .audioEmbed[data-realid='${window.player.current_track_id}'] .audioEntry`).addClass('nowPlaying')
            }
        } else {
            u(`.audiosContainer .audioEmbed[data-realid='${window.player.current_track_id}'] .audioEntry, .audios_padding .audioEmbed[data-realid='${window.player.current_track_id}'] .audioEntry`).addClass('nowPlaying')
        }
    }

    $(document).on('mouseenter', '.menu_toggler_vkify', function (e) {
        const post_buttons = $(e.target).closest('.post-buttons')
        const wall_attachment_menu = post_buttons.find('#wallAttachmentMenu')
        if (wall_attachment_menu.is('.hidden')) {
            wall_attachment_menu.css({ opacity: 0 });
            wall_attachment_menu.toggleClass('hidden').fadeTo(250, 1);
            wall_attachment_menu.addClass('small');
        }
    });
    $(document).on('mouseenter', '.menu_toggler', function (e) {
        const post_buttons = $(e.target).closest('.post-buttons')
        const wall_attachment_menu = post_buttons.find('#wallAttachmentMenu')
        if (wall_attachment_menu.is('.hidden')) {
            wall_attachment_menu.css({ opacity: 0 });
            wall_attachment_menu.toggleClass('hidden').fadeTo(250, 1);
            wall_attachment_menu.addClass('small');
        }
    });

    window.vkifyGraffiti = function (e) {
        const contextToUse = window.graffitiWriteContext && window.graffitiWriteContext.length
            ? { target: window.graffitiWriteContext.nodes[0] }
            : e;

        if (localStorage.getItem('vkify.graffitiType') == "1") {
            window.initVKGraffiti(contextToUse);
        } else {
            initGraffiti(contextToUse);
        }

        if (window.graffitiWriteContext) {
            window.graffitiWriteContext = null;
        }
    }

    player.__setFavicon = function (state = 'playing') {
        if (state == 'playing') {
            document.querySelector('link[rel="icon"], link[rel="shortcut icon"]').setAttribute("href", vkfavicon["playiconnew"])
        } else {
            document.querySelector('link[rel="icon"], link[rel="shortcut icon"]').setAttribute("href", vkfavicon["pauseiconnew"])
        }
    }

    const originalInitEvents = window.player.initEvents;
    window.player.initEvents = function () {
        originalInitEvents.call(this);
        if (this.audioPlayer) {
            this.audioPlayer.ontimeupdate = () => {
                const current_track = this.currentTrack;
                if (!current_track) {
                    return;
                }
                /* я не умею считать так что пусть будет пиксель пёрфект) */
                const time = this.audioPlayer.currentTime;
                const ps = ((time * 100) / current_track.length).toFixed(3);
                this.uiPlayer.find(".time").html(fmtTime(time));
                this.__updateTime(time);

                if (ps <= 100) {
                    this.uiPlayer.find(".track .selectableTrack .slider").attr('style', `padding-left:${ps}%`);

                    if (this.linkedInlinePlayer) {
                        this.linkedInlinePlayer.find(".subTracks .lengthTrackWrapper .slider").attr('style', `padding-left:${ps}%`);
                        this.linkedInlinePlayer.find('.mini_timer .nobold').html(fmtTime(time));
                    }
                }
            };

            this.audioPlayer.onvolumechange = () => {
                const volume = this.audioPlayer.volume;
                const ps = (volume * 100).toFixed(1);

                this.uiPlayer.find(".volumePanel .selectableTrack .slider").attr('style', `padding-left:${ps}%`);

                if (this.linkedInlinePlayer) {
                    this.linkedInlinePlayer.find(".subTracks .volumeTrackWrapper .slider").attr('style', `padding-left:${ps}%`);
                }

                localStorage.setItem('audio.volume', volume);
            };
        }
    };
    window.player.initEvents();
    const friendsd = await window.OVKAPI.call("friends.get", { "user_id": window.openvk.current_id, "fields": "first_name,last_name,photo_50", "count": 100 })
    const friendsmap = friendsd.items
        .slice(0, friendsd.count)
        .map(item => ({
            id: item.id,
            photo_50: item.photo_50,
            first_name: item.first_name,
            last_name: item.last_name
        }));
    let friendshtml = ''
    friendsmap.forEach((user) => {
        friendshtml += `
    <a class="ui_rmenu_item ui_ownblock" onclick="tippy.hideAll();" href="/audios${user.id}">
        <img class="ui_ownblock_img" src="${user.photo_50}">
        <div class="ui_ownblock_info">
            <div class="ui_ownblock_label">${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}</div>
        </div>
    </a>
  `;
    });

    const mushtml = `
<div class="bigPlayer ctx_place">
    <div class="bigPlayerWrapper">
        <div class="playButtons">
            <div onmousedown="this.classList.add('pressed')" onmouseup="this.classList.remove('pressed')" class="playButton musicIcon" data-tip="simple-black" data-align="bottom-start" data-title="${tr('play_tip')}"><div class="playIcon"></div></div>
            <div class="arrowsButtons">
                <div class="nextButton musicIcon" data-tip="simple-black" data-align="bottom-start" data-title=""></div>
                <div class="backButton musicIcon" data-tip="simple-black" data-align="bottom-start" data-title=""></div>
            </div>
        </div>

        <div class="trackPanel">
            <div class="trackInfo">
                <div class="trackName">
                    <span class="trackPerformers"><a href="/">?</a></span> —
                    <span>?</span>
                </div>

                <div class="timer">
                    <span class="time">00:00</span>
                    <span>/</span>
                    <span class="elapsedTime">-00:00</span>
                </div>
            </div>

            <div class="track">
                <div class="selectableTrack">
                    <div id="bigPlayerLengthSliderWrapper">&nbsp;
                        <div class="slider"></div>
                    </div>
                    <div class="selectableTrackLoadProgress">
                        <div class="load_bar"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="volumePanel">
            <div class="volumePanelTrack">
                <div class="selectableTrack">
                    <div id="bigPlayerVolumeSliderWrapper">&nbsp;
                        <div class="slider" style="padding-left:100%"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="additionalButtons">
            <div class="repeatButton musicIcon" data-tip="simple-black" data-align="bottom-end" data-title="${tr('repeat_tip')}"></div>
            <div class="shuffleButton musicIcon" data-tip="simple-black" data-align="bottom-end" data-title="${tr('shuffle_tip')}"></div>
            <div class="deviceButton musicIcon" data-tip="simple-black" data-align="bottom-end" data-title="${tr('mute_tip')}"></div>
        </div>
    </div>
</div>
<div class="wide_column_left">
    <div class="wide_column_wrap">
        <div class="wide_column">
            <div class="vkifytracksplaceholder"></div>
            <div class="musfooter">
                <span class="playingNow"></span>
                <a id="ajclosebtn" onclick="tippy.hideAll();"><vkifyloc name="clear_playlist"></vkifyloc></a>
            </div>
        </div>
    </div>
    <div class="narrow_column_wrap">
        <div class="narrow_column">
            <div class="ui_rmenu ui_rmenu_pr audio_tabs">
                <a class="ui_rmenu_item" onclick="tippy.hideAll();" href="/audios${window.openvk.current_id}">
                    <span>${tr('my_music')}</span>
                    <span class="ui_rmenu_extra_item addAudioSmall" onclick="tippy.hideAll(); showAudioUploadPopup(); return false;" data-href="/player/upload"><div class="addIcon"></div></span>
                </a>
                <a class="ui_rmenu_item" onclick="tippy.hideAll();" href="/audios/uploaded">${tr('my_audios_small_uploaded')}</a>
                <a class="ui_rmenu_item" onclick="tippy.hideAll();" href="/search?section=audios" id="ki">${tr('audio_new')}</a>
                <a class="ui_rmenu_item" onclick="tippy.hideAll();" href="/search?section=audios&order=listens" id="ki">${tr('audio_popular')}</a>
                <div class="ui_rmenu_sep"></div>
                <a class="ui_rmenu_item" onclick="tippy.hideAll();" href="/playlists${window.openvk.current_id}" id="ki">${tr('my_playlists')}</a>
                <a class="ui_rmenu_item" onclick="tippy.hideAll();" href="/audios/newPlaylist">${tr('new_playlist')}</a>
                <div class="ui_rmenu_sep"></div>
            </div>
            <div class="friends_audio_list">
            ${friendshtml}
            </div>
        </div>
    </div>
</div>
`
    tippy(document.querySelector('#headerMusicLinkDiv'), {
        content: mushtml,
        allowHTML: true,
        trigger: 'click',
        interactive: true,
        placement: 'bottom-start',
        theme: 'musicpopup',
        arrow: false,
        getReferenceClientRect: () => {
            const searchBox = document.querySelector('.home_search');
            if (!searchBox) {
                const headerMusicBtn = document.querySelector('#headerMusicBtn');
                const rect = headerMusicBtn.getBoundingClientRect();
                return {
                    width: rect.width,
                    height: rect.height,
                    top: rect.top,
                    bottom: rect.bottom,
                    left: rect.left,
                    right: rect.right,
                };
            }

            const rect = searchBox.getBoundingClientRect();
            return {
                width: rect.width,
                height: rect.height,
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                right: rect.right,
            };
        },
        maxWidth: 'var(--page-width)',
        appendTo: document.body,
        popperOptions: { modifiers: [{ name: 'offset', options: { offset: [0, 0] } }] },
        onHidden() {
            window.musHtml = undefined;
            document.querySelector('.top_audio_player').classList.remove('audio_top_btn_active');
        },
        onShow() {
            document.querySelector('.top_audio_player').classList.add('audio_top_btn_active');
        },
        async onMount(instance) {
            window.musHtml = instance.popper;
            const placeholder = instance.popper.querySelector('.vkifytracksplaceholder') || instance.popper.querySelector('.audiosContainer.audiosSideContainer.audiosPaddingContainer');
            let playingNowLnk
            if (placeholder) {
                const parsedAudio = parseAudio();
                const trackList = `${parsedAudio.scrollContainer}`;
                placeholder.outerHTML = trackList;
                playingNowLnk = parsedAudio.nowPlayingUrl.replace(/^\//, '');
                if (instance.popper.querySelector('.loadMore')) {
                    instance.popper.querySelector('.musfooter .playingNow').innerHTML = `<img src="data:image/gif;base64,R0lGODlhIAAIAKECAEVojoSctMHN2QAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQFCgADACwAAAAAIAAIAAACFZyPqcvtD6KMr445LcRUN9554kiSBQAh+QQFCgADACwCAAIAEgAEAAACD4xvM8DNiJRz8Mj5ari4AAAh+QQFCgADACwCAAIAHAAEAAACGJRvM8HNCqKMCCnn4JT1XPwMG9cJH6iNBQAh+QQFCgADACwMAAIAEgAEAAACD5RvM8HNiJRz8Mj5qri4AAAh+QQFCgADACwWAAIACAAEAAACBZSPqYsFACH5BAUUAAMALAAAAAAgAAgAAAIOnI+py+0Po5y02ouzPgUAOw==">`;
                    const loadMoreBtn = instance.popper.querySelector('.loadMore');
                    loadMoreBtn.onclick = async function (e) { 
                        e.preventDefault();
                        await loadMoreAudio(); 
                    };
                }
            }
            u(`.audiosContainer .audioEmbed .audioEntry, .audios_padding .audioEmbed`).removeClass('nowPlaying');
            u(`.audiosContainer .audioEmbed[data-realid='${window.player.current_track_id}'] .audioEntry, .audios_padding .audioEmbed[data-realid='${window.player.current_track_id}'] .audioEntry`).addClass('nowPlaying')
            window.player.__updateFace();
            window.player.audioPlayer.onvolumechange();
            const acont = instance.popper.querySelector('.audiosContainer.audiosSideContainer.audiosPaddingContainer');
            const aplaying = acont?.querySelector('.audioEntry.nowPlaying');
            if (acont && aplaying) {
                const aplayingRect = aplaying.getBoundingClientRect();
                const acontRect = acont.getBoundingClientRect();
                acont.scrollTo({
                    top: aplayingRect.top - acontRect.top + acont.scrollTop - (acont.clientHeight / 2) + (aplayingRect.height / 2),
                    behavior: 'smooth'
                });
            }
            if (/^(playlist\d+_\d+|audios-?\d+)(\?.*)?$/.test(playingNowLnk)) {
                if (/^(audios-?\d+)(\?.*)?$/.test(playingNowLnk)) {
                    try {
                        let plName = (await window.OVKAPI.call("users.get", { "user_ids": Number(playingNowLnk.match(/[^\d]*(\d+)/)[1]), "fields": "first_name" }))[0].first_name;
                        instance.popper.querySelector('.musfooter .playingNow').innerHTML = `${window.vkifylang.currentlyplaying}<a onclick="tippy.hideAll();" href=${playingNowLnk}>${tr('audios')} <b>${escapeHtml(plName)}</b></a>`
                    } catch (error) {
                        console.error('failed to load playing now', error)
                        instance.popper.querySelector('.musfooter .playingNow').innerHTML = ``
                    }
                } if (/^(playlist\d+_\d+)(\?.*)?$/.test(playingNowLnk)) {
                    try {
                        let plName = (await window.OVKAPI.call("audio.getAlbums", { "owner_id": Number(playingNowLnk.match(/(\d+)_(\d+)/)[1]) })).items.find(item => item.id === Number(playingNowLnk.match(/(\d+)_(\d+)/)[2])).title;
                        instance.popper.querySelector('.musfooter .playingNow').innerHTML = `${window.vkifylang.currentlyplaying}<a onclick="tippy.hideAll();" href=${playingNowLnk}>${tr('playlist')} <b>${escapeHtml(plName)}</b></a>`
                    } catch (error) {
                        console.error('failed to load playing now', error)
                        instance.popper.querySelector('.musfooter .playingNow').innerHTML = ``
                    }
                }
            } else {
                instance.popper.querySelector('.musfooter .playingNow').innerHTML = ``
            }
        }
    });

    const topPlayer = document.querySelector('#top_audio_player');
    const headerMusicBtn = document.querySelector('#headerMusicBtn');
    const topPlayerTitle = topPlayer.querySelector('.top_audio_player_title');
    const topPlayerPlay = topPlayer.querySelector('.top_audio_player_play');
    const topPlayerPrev = topPlayer.querySelector('.top_audio_player_prev');
    const topPlayerNext = topPlayer.querySelector('.top_audio_player_next');

    let currentTrackId = null;
    
    function updateTopPlayer() {
        if (window.player && window.player.currentTrack) {
            topPlayer.classList.add('top_audio_player_enabled');
            headerMusicBtn.style.display = 'none';
            
            if (currentTrackId !== window.player.currentTrack.id) {
                currentTrackId = window.player.currentTrack.id;
                topPlayerTitle.style.opacity = '0';
                setTimeout(() => {
                    topPlayerTitle.textContent = `${window.player.currentTrack.performer} — ${window.player.currentTrack.name}`;
                    topPlayerTitle.style.opacity = '1';
                }, 60);
            }
            
            topPlayer.classList.toggle('top_audio_player_playing', !window.player.audioPlayer.paused);
        } else {
            topPlayer.classList.remove('top_audio_player_enabled');
            topPlayerTitle.textContent = '';
            headerMusicBtn.removeAttribute('style');
            currentTrackId = null;
        }
    }

    const originalUpdateFace = window.player.__updateFace;
    window.player.__updateFace = function() {
        originalUpdateFace.call(this);
        updateTopPlayer();
    };

    topPlayerPlay.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent tippy from opening
        if (window.player.audioPlayer.paused) {
            window.player.play();
        } else {
            window.player.pause();
        }
        updateTopPlayer();
    });

    topPlayerPrev.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent tippy from opening
        if (window.player.currentTrack) {
            window.player.playPreviousTrack();
        }
    });

    topPlayerNext.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent tippy from opening
        if (window.player.currentTrack) {
            window.player.playNextTrack();
        }
    });

    if (window.player && window.player.audioPlayer) {
        window.player.audioPlayer.addEventListener('play', updateTopPlayer);
        window.player.audioPlayer.addEventListener('pause', updateTopPlayer);
        
        updateTopPlayer();
    }

    $(document).on("click", "#ajclosebtn", function () {
        window.player.ajClose();
    });

    window.initNotificationsPopup();

    $(document).on("click", ".statusButton.musicIcon", function (event) {
        event.preventDefault();
        $(this).toggleClass("pressed");
        const formData = new FormData();
        formData.append("status", document.forms['status_popup_form'].status.value);
        formData.append("broadcast", $(this).hasClass("pressed") ? 1 : 0);
        formData.append("hash", document.forms['status_popup_form'].hash.value);

        $.ajax({
            url: "/edit?act=status",
            method: "POST",
            processData: false,
            contentType: false,
            data: formData,
        });
    });

    CMessageBox.prototype.__getTemplate = function () {
        return u(
            `<div class="ovk-diag-cont ovk-msg-all" data-id="${this.id}">
      <div class="ovk-diag">
         <div class="ovk-diag-head">${this.title}<div class="ovk-diag-head-close" onclick="window.__vkifyCloseDialog()"></div></div>
         <div class="ovk-diag-body">${this.body}</div>
         <div class="ovk-diag-action"></div>
      </div>
 </div>`)
    };

    window.__vkifyCloseDialog = async function () {
        const msg = window.messagebox_stack[window.messagebox_stack.length - 1]
        if (!msg) {
            return
        }
        if (msg.close_on_buttons) {
            msg.close()
            return
        }

        let shouldWarn = msg.warn_on_exit;

        if (msg.attachmentDialog) {
            const selectionCount = msg.attachmentDialog.getSelectionCount();
            shouldWarn = selectionCount >= 1;
        }

        if (shouldWarn) {
            if (typeof msg.__showCloseConfirmationDialog === 'function') {
                const res = await msg.__showCloseConfirmationDialog()
                if (res === true) {
                    msg.close()
                }
            } else {
                if (confirm(tr('exit_confirmation'))) {
                    msg.close();
                }
            }
        } else {
            msg.close()
        }
    }

    u(document).on('keyup', async (e) => {
        if(e.keyCode == 27 && window.messagebox_stack.length > 0) {
            await window.__vkifyCloseDialog();
        }
    })

    u(document).on('click', 'body.dimmed .dimmer', async (e) => {
        if(u(e.target).hasClass('dimmer')) {
            await window.__vkifyCloseDialog();
        }
    })

    function initializeSimpleTooltips() {
        const elements = document.querySelectorAll('[data-tip="simple-black"]');
        elements.forEach(element => {
            if (element._tippy || element.hasAttribute('aria-describedby')) {
                return;
            }

            const title = element.getAttribute('data-title');
            const align = element.getAttribute('data-align') || 'top';

            if (!title || title.trim() === '' || title.startsWith('{_')) {
                return;
            }

            let placement = 'top';
            switch(align) {
                case 'top-start':
                    placement = 'top-start';
                    break;
                case 'top-end':
                    placement = 'top-end';
                    break;
                case 'top-center':
                    placement = 'top';
                    break;
                case 'bottom-start':
                    placement = 'bottom-start';
                    break;
                case 'bottom-end':
                    placement = 'bottom-end';
                    break;
                case 'bottom-center':
                    placement = 'bottom';
                    break;
                default:
                    placement = 'top';
            }

            tippy(element, {
                content: escapeHtml(title),
                theme: 'special vk small',
                placement: placement,
                animation: 'fade',
                duration: [100, 100],
                delay: [50, 0],
                offset: [0, 8],
                appendTo: 'parent'
            });
        });
    }

    initializeSimpleTooltips();

    const observer = new MutationObserver((mutations) => {
        let shouldReinit = false;
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.hasAttribute && node.hasAttribute('data-tip') ||
                            node.querySelector && node.querySelector('[data-tip="simple-black"]')) {
                            shouldReinit = true;
                        }
                    }
                });
            }
        });
        if (shouldReinit) {
            initializeSimpleTooltips();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    window.router.route = async function (params = {}) {
        if (typeof params == 'string') {
            params = {
                url: params
            }
        }

        const old_url = location.href
        let url = params.url
        if (url.indexOf(location.origin)) {
            url = location.origin + url
        }

        if ((localStorage.getItem('ux.disable_ajax_routing') ?? 0) == 1 || window.openvk.current_id == 0) {
            window.location.assign(url)
            return
        }

        window.favloader.start();

        if (this.prev_page_html && this.prev_page_html.pathname != location.pathname) {
            this.prev_page_html = null
        }

        const push_url = params.push_state ?? true
        const next_page_url = new URL(url)
        if (push_url) {
            history.pushState({ 'from_router': 1 }, '', url)
        } else {
            history.replaceState({ 'from_router': 1 }, '', url)
        }

        const parser = new DOMParser
        const next_page_request = await fetch(next_page_url, {
            method: 'AJAX',
            referrer: old_url,
            headers: {
                'X-OpenVK-Ajax-Query': '1',
            }
        })
        const next_page_text = await next_page_request.text()
        const parsed_content = parser.parseFromString(next_page_text, 'text/html')

        if (next_page_request.status >= 400) {
            const errorTitle = parsed_content.querySelector('title')?.textContent?.trim() || tr('error');
            const errorMessage = parsed_content.querySelector('main p')?.textContent?.trim() || next_page_request.statusText || 'An error occurred while loading the page.';

            history.replaceState({ 'from_router': 1 }, '', old_url);

            MessageBox(errorTitle, errorMessage, [tr("ok")], [() => {}]);
            window.favloader.stop();
            return;
        }

        if (next_page_request.redirected) {
            history.replaceState({ 'from_router': 1 }, '', next_page_request.url)
        }

        this.__closeMsgs()
        this.__unlinkObservers()

        try {
            this.__appendPage(parsed_content)
            await this.__integratePage()
        } catch (e) {
            console.error(e)
            next_page_url.searchParams.delete('al', 1)
            location.assign(next_page_url)
        }
        window.favloader.stop();
    }

});

function initializeSearchFastTips() {
    const searchInput = u('#search_box input[type="search"]');
    const fastTipsContainer = u('#searchBoxFastTips');

    if (!searchInput.length || !fastTipsContainer.length) return;

    let searchTimeout;
    let currentSearchId = 0;

    function hideFastTips() {
        fastTipsContainer.first().style.display = "none";
    }

    searchInput.on('input', async function(e) {
        const query = u(e.target).first().value.trim();

        if (query.length >= 3) {
            fastTipsContainer.first().style.display = "block";
            clearTimeout(searchTimeout);

            currentSearchId++;
            const thisSearchId = currentSearchId;

            searchTimeout = setTimeout(async () => {
                const currentQuery = u(e.target).first().value.trim();
                if (currentQuery !== query || currentQuery.length < 3 || thisSearchId !== currentSearchId) return;

                fastTipsContainer.html(`<div class="fastpreload"></div>`);

                try {
                    const [groupsd, usersd, audiosd, docsd] = await Promise.all([
                        window.OVKAPI.call("groups.search", { "q": currentQuery }),
                        window.OVKAPI.call("users.search", { "q": currentQuery, "fields": "photo_50" }),
                        window.OVKAPI.call("audio.search", { "q": currentQuery }),
                        window.OVKAPI.call("docs.search", { "q": currentQuery })
                    ]);

                    if (thisSearchId !== currentSearchId) return;

                    const maxUsers = Math.min(5, usersd.count);
                    const minusers = usersd.items.slice(0, maxUsers).map(item => ({
                        id: item.id,
                        photo_50: item.photo_50,
                        first_name: item.first_name
                    }));

                    let fastusers = "";
                    minusers.forEach((user) => {
                        fastusers += `
                            <a class="fastavatarlnk" href="/id${user.id}">
                                <img class="fastavatar" src="${user.photo_50}" alt="${escapeHtml(user.first_name)}">
                                <span>${escapeHtml(user.first_name)}</span>
                            </a>
                        `;
                    });

                    fastTipsContainer.html(`
                        <div>
                            <div class="useravas">
                                ${fastusers}
                            </div>
                            <a href="/search?section=users&q=${encodeURIComponent(currentQuery)}">
                                <div class="fastresult">
                                    ${tr('users')} <b>${escapeHtml(currentQuery)}</b> (${usersd.count})
                                    <div class="arrow"></div>
                                </div>
                            </a>
                        </div>
                        <div>
                            <a href="/search?section=groups&q=${encodeURIComponent(currentQuery)}">
                                <div class="fastresult">
                                    ${tr('groups')} <b>${escapeHtml(currentQuery)}</b> (${groupsd.count})
                                    <div class="arrow"></div>
                                </div>
                            </a>
                        </div>
                        <div>
                            <a href="/search?section=audios&q=${encodeURIComponent(currentQuery)}">
                                <div class="fastresult">
                                    ${tr('audios')} <b>${escapeHtml(currentQuery)}</b> (${audiosd.count})
                                    <div class="arrow"></div>
                                </div>
                            </a>
                        </div>
                        <div>
                            <a href="/search?section=docs&q=${encodeURIComponent(currentQuery)}">
                                <div class="fastresult">
                                    ${tr('documents')} <b>${escapeHtml(currentQuery)}</b> (${docsd.count})
                                    <div class="arrow"></div>
                                </div>
                            </a>
                        </div>
                    `);

                    u('#searchBoxFastTips a').on('click', function() {
                        hideFastTips();
                    });
                } catch (error) {
                    console.error('Failed to load search tip results:', error);
                    if (thisSearchId !== currentSearchId) return;
                    fastTipsContainer.html(`
                        <div>
                            <a href="/search?section=users&q=${encodeURIComponent(currentQuery)}">
                                <div class="fastresult">
                                    ${tr('users')} <b>${escapeHtml(currentQuery)}</b>
                                    <div class="arrow"></div>
                                </div>
                            </a>
                        </div>
                        <div>
                            <a href="/search?section=groups&q=${encodeURIComponent(currentQuery)}">
                                <div class="fastresult">
                                    ${tr('groups')} <b>${escapeHtml(currentQuery)}</b>
                                    <div class="arrow"></div>
                                </div>
                            </a>
                        </div>
                        <div>
                            <a href="/search?section=audios&q=${encodeURIComponent(currentQuery)}">
                                <div class="fastresult">
                                    ${tr('audios')} <b>${escapeHtml(currentQuery)}</b>
                                    <div class="arrow"></div>
                                </div>
                            </a>
                        </div>
                        <div>
                            <a href="/search?section=docs&q=${encodeURIComponent(currentQuery)}">
                                <div class="fastresult">
                                    ${tr('documents')} <b>${escapeHtml(currentQuery)}</b>
                                    <div class="arrow"></div>
                                </div>
                            </a>
                        </div>
                    `);

                    u('#searchBoxFastTips a').on('click', function() {
                        hideFastTips();
                    });
                }
            }, 1000);
        } else {
            fastTipsContainer.first().style.display = "none";
        }
    });

    searchInput.on('focus', function(e) {
        const inputValue = u(e.target).first().value;
        if (inputValue.length >= 3) {
            fastTipsContainer.first().style.display = "block";

            setTimeout(() => {
                u('#searchBoxFastTips a').on('click', function() {
                    hideFastTips();
                });
            }, 50);
        } else {
            fastTipsContainer.first().style.display = "none";
        }
    });

    searchInput.on('blur', function() {
        setTimeout(() => {
            const focusedElement = document.activeElement;
            if (!u(focusedElement).closest('#search_box').length) {
                fastTipsContainer.first().style.display = "none";
            }
        }, 250);
    });

    u(document).on('click', function(e) {
        const searchBox = u('#search_box').first();
        const fastTips = fastTipsContainer.first();

        if (fastTips.style.display === "block" &&
            !searchBox.contains(e.target) &&
            !fastTips.contains(e.target)) {
            hideFastTips();
        }
    });


}

u(document).on('DOMContentLoaded', initializeSearchFastTips);
window.initializeSearchFastTips = initializeSearchFastTips;

window.hideSearchFastTips = function() {
    const fastTipsContainer = u('#searchBoxFastTips');
    if (fastTipsContainer.length) {
        fastTipsContainer.first().style.display = "none";
    }
};

if (window.location.pathname === '/search') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.initializeSearchFastTips) {
            window.initializeSearchFastTips();
        } else {
            setTimeout(() => {
                if (window.initializeSearchFastTips) {
                    window.initializeSearchFastTips();
                }
            }, 100);
        }
    });
}

async function changeStatus() {
    const status = document.status_popup_form.status.value;
    const broadcast = document.status_popup_form.broadcast.checked;

    document.status_popup_form.submit.innerHTML = "<div class=\"button-loading\"></div>";
    document.status_popup_form.submit.disabled = true;

    const formData = new FormData();
    formData.append("status", status);
    formData.append("broadcast", Number(broadcast));
    formData.append("hash", document.status_popup_form.hash.value);
    const response = await ky.post("/edit?act=status", { body: formData });

    if (!parseAjaxResponse(await response.text())) {
        document.status_popup_form.submit.innerHTML = tr("send");
        document.status_popup_form.submit.disabled = false;
        return;
    }

    if (document.status_popup_form.status.value === "") {
        document.querySelector("#page_status_text").innerHTML = `${tr("change_status")}`;
        document.querySelector("#page_status_text").className = "edit_link page_status_edit_button";
    } else {
        document.querySelector("#page_status_text").innerHTML = escapeHtml(status);
        document.querySelector("#page_status_text").className = "page_status page_status_edit_button";
    }

    setStatusEditorShown(false);
    document.status_popup_form.submit.innerHTML = tr("send");
    document.status_popup_form.submit.disabled = false;
}

function switchProfileInfo() {
    const infoblock = document.querySelector('.profileinfoblock')
    const infobtn = document.querySelector('#showFullInfoButton')
    if (infoblock && infobtn) {
        if (infoblock.style.display === "none") {
            infoblock.style.display = "block"
            infobtn.text = tr('close_comments')
        } else {
            infoblock.style.display = "none"
            infobtn.text = tr('show_comments')
        }
    }
}

const today = new Date();
if (today.getDate() === 1 && today.getMonth() === 3) {
    const doge = document.createElement('script');
    doge.setAttribute('src', '/themepack/vkify16/3.3.1.5/resource/doge.js');
    document.head.appendChild(doge);
    u(document).on('click', '.post-like-button', function () {
        if (u(this).find('#liked').length) { Doge.show(); }
    });
}

const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const element = mutation.target;
            if (element.classList.contains('tip_result')) {
                const isInTippy = element.closest('.tippy-content');
                if (isInTippy) {
                    const currentStyle = element.getAttribute('style');
                    if (currentStyle && currentStyle.includes('315.5px') && !currentStyle.includes('578px')) {
                        const newStyle = currentStyle.replace('315.5px', '578px');
                        element.setAttribute('style', newStyle);
                    }
                }
            }
        }
    });
});

observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['style'],
    subtree: true
});

window.toggleDarkMode = function(enabled) {
    const body = document.body;
    const darkModeLink = document.getElementById('dark-mode-css');

    if (enabled) {
        body.classList.add('dark-mode');
        body.classList.add('theme-switching');
        setTimeout(() => {
            body.classList.remove('theme-switching');
        }, 500);
        if (!darkModeLink) {
            const link = document.createElement('link');
            link.id = 'dark-mode-css';
            link.rel = 'stylesheet';
            link.href = '/themepack/vkify16/3.3.1.5/resource/css/dark-mode.css';
            document.head.appendChild(link);
        }
    } else {
        body.classList.add('theme-switching');
        setTimeout(() => {
            body.classList.remove('theme-switching');
        }, 500);
        body.classList.remove('dark-mode');
        if (darkModeLink) {
            darkModeLink.remove();
        }
    }
};

function reportNote(noteId) {
    uReportMsgTxt = tr("going_to_report_note");
    uReportMsgTxt += "<br/>" + tr("report_question_text");
    uReportMsgTxt += "<br/><br/><b>" + tr("report_reason") + "</b>: <input type='text' id='uReportMsgInput' placeholder='" + tr("reason") + "' />"

    MessageBox(tr("report_question"), uReportMsgTxt, [tr("confirm_m"), tr("cancel")], [
        (function () {
            res = document.querySelector("#uReportMsgInput").value;
            xhr = new XMLHttpRequest();
            xhr.open("GET", "/report/" + noteId + "?reason=" + res + "&type=note", true);
            xhr.onload = (function () {
                if (xhr.responseText.indexOf("reason") === -1)
                    MessageBox(tr("error"), tr("error_sending_report"), ["OK"], [Function.noop]);
                else
                    MessageBox(tr("action_successfully"), tr("will_be_watched"), ["OK"], [Function.noop]);
            });
            xhr.send(null);
        }),
        Function.noop
    ]);
}

window.reportsManager = {
    currentMode: null,
    refreshInterval: null,
    isLoading: false,

    init() {
        if (!window.location.pathname.includes('/scumfeed')) return;

        this.currentMode = this.getModeFromUrl();
        this.bindEvents();
        this.startAutoRefresh();
    },

    getModeFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('act') || 'all';
    },

    bindEvents() {
        u(document).on('click', '.ui_rmenu_item', (e) => {
            const link = e.target.closest('a');
            if (!link || !link.href.includes('/scumfeed')) return;

            e.preventDefault();
            const url = new URL(link.href);
            const mode = url.searchParams.get('act') || 'all';
            this.switchMode(mode);
        });
    },

    async switchMode(mode) {
        if (this.isLoading || mode === this.currentMode) return;

        this.currentMode = mode;
        this.updateActiveTab(mode);
        this.showLoading();

        try {
            await this.loadReports(mode);
            if (window.router && window.router.route) {
                window.router.route(`/scumfeed?act=${mode}`);
            } else {
                history.pushState(null, null, `/scumfeed?act=${mode}`);
            }
        } catch (error) {
            console.error('Failed to load reports:', error);
            this.showError();
        } finally {
            this.hideLoading();
        }
    },

    updateActiveTab(mode) {
        u('.ui_rmenu_item').removeClass('ui_rmenu_item_sel');
        u(`.ui_rmenu_item[href*="act=${mode}"]`).addClass('ui_rmenu_item_sel');
        u(`.ui_rmenu_item[href="/scumfeed"]`).toggleClass('ui_rmenu_item_sel', mode === 'all');
    },

    showLoading() {
        this.isLoading = true;
        const listView = u('.page_block.list_view');
        if (listView.length) {
            listView.html('<div class="content_page_error pr"><div class="pr_bt"></div><div class="pr_bt"></div><div class="pr_bt"></div></div>');
        }
    },

    hideLoading() {
        this.isLoading = false;
    },

    async loadReports(mode) {
        const formData = new FormData();
        const csrfToken = window.router?.csrf ||
                         u('input[name="hash"]').first()?.value ||
                         u('meta[name="csrf-token"]').attr('content');

        if (csrfToken) {
            formData.append('hash', csrfToken);
        }

        const response = await fetch(`/scumfeed?act=${mode}`, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-OpenVK-Ajax-Query': '1'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Invalid response format');
        }

        const data = await response.json();
        this.renderReports(data.reports || []);
        
        const counterElement = u('.page_block_header_count');
        if (counterElement.length) {
            counterElement.text(data.reports.length);
        }

        if (data.reports && data.reports.length > 0) {
            this.checkForNewReports(data.reports.length);
        }
    },

    renderReports(reports) {
        const listView = u('.page_block.list_view');
        if (!listView.length) return;

        if (reports.length === 0) {
            listView.html(`
                <div class="content_page_error">
                    ${tr('no_data_description')}
                </div>
            `);
            return;
        }

        const reportsHtml = reports.map(report => this.renderReport(report)).join('');
        listView.html(reportsHtml);
    },

    renderReport(report) {
        const duplicatesHtml = report.duplicates > 0 ? `
            <br>
            <b>Другие жалобы на этот контент: <a href="/scumfeed?orig=${report.id}">${report.duplicates} шт.</a></b>
        ` : '';

        const contentLink = report.content.type === "user" ?
            `<a href="${report.content.url}">${report.content.name}</a>` :
            report.content.name;

        return `
            <div class="search_row">
                <div class="info">
                    <div class="labeled name">
                        <a href="/admin/report${report.id}">
                            <b>Жалоба №${report.id}</b>
                        </a>
                    </div>
                    <a href="${report.author.url}">${report.author.name}</a>
                    пожаловал${report.author.is_female ? "ась" : "ся"} на
                    ${contentLink}
                    ${duplicatesHtml}
                </div>
            </div>
        `;
    },

    checkForNewReports(currentCount) {
        if (this.lastReportCount && currentCount > this.lastReportCount) {
            if (window.NewNotification) {
                NewNotification("Обратите внимание", "В списке появились новые жалобы. Работа ждёт :)");
            }
        }
        this.lastReportCount = currentCount;
    },

    showError() {
        const listView = u('.page_block.list_view');
        if (listView.length) {
            listView.html(`
                <div class="content_page_error">
                    Ошибка загрузки данных. Попробуйте обновить страницу.
                </div>
            `);
        }
    },

    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            if (!this.isLoading && this.currentMode) {
                this.loadReports(this.currentMode).catch(console.error);
            }
        }, 10000);
    },

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    },

    destroy() {
        this.stopAutoRefresh();
        u(document).off('click', '.ui_rmenu_item');
    }
};

function initReportsManager() {
    if (window.reportsManager) {
        window.reportsManager.init();
    }
}

document.addEventListener('DOMContentLoaded', initReportsManager);

if (window.router && window.router.addEventListener) {
    window.router.addEventListener('route', () => {
        setTimeout(initReportsManager, 100);
    });
} else {
    document.addEventListener('page:loaded', () => {
        setTimeout(initReportsManager, 100);
    });
}

window.addEventListener('beforeunload', () => {
    if (window.reportsManager) {
        window.reportsManager.destroy();
    }
});

window.initAlbumPhotosLoader = function() {
    const photosSection = document.getElementById('photos-section');
    if (!photosSection) return;

    if (photosSection.dataset.initialized === 'true') {
        console.log('Photo loader already initialized, skipping');
        return;
    }

    photosSection.dataset.initialized = 'true';

    const ownerId = parseInt(document.querySelector('[data-owner-id]')?.dataset.ownerId);
    if (!ownerId) return;

    const photosPerLoad = 20;
    let photosLoaded = 0;
    let totalPhotos = 0;

    function waitForAPI() {
        return new Promise((resolve) => {
            if (window.OVKAPI && window.OVKAPI.call) {
                resolve();
            } else {
                setTimeout(() => waitForAPI().then(resolve), 100);
            }
        });
    }

    async function loadPhotos(offset = 0) {
        try {
            console.log('Loading photos with offset:', offset);

            let photos;
            try {
                await waitForAPI();
                photos = await window.OVKAPI.call('photos.getAll', {
                    'owner_id': ownerId,
                    'photo_sizes': 1,
                    'count': photosPerLoad,
                    'offset': offset
                });
            } catch (apiError) {
                console.log('OVKAPI failed:', apiError);
                return;
            }

            if (offset === 0) {
                totalPhotos = photos.count;
                document.getElementById('photos-loading').style.display = 'none';

                if (totalPhotos === 0) {
                    return;
                }

                const photosContainer = document.getElementById('photos-container');
                photosContainer.innerHTML = '';
                photosLoaded = 0;

                document.getElementById('photos-section').style.display = 'block';

                const headerCount = document.querySelector('#photos-section .page_block_header_count');
                if (headerCount) {
                    headerCount.textContent = totalPhotos;
                    headerCount.style.display = 'inline';
                }
            }

            if (photos.items && photos.items.length > 0) {
                const newPhotosByYear = {};
                photos.items.forEach(photo => {
                    const year = new Date(photo.date * 1000).getFullYear();
                    if (!newPhotosByYear[year]) {
                        newPhotosByYear[year] = [];
                    }
                    newPhotosByYear[year].push({
                        id: photo.owner_id + '_' + photo.id,
                        url_small: photo.src_big || photo.src,
                        url_large: photo.src_xbig || photo.src_big || photo.src,
                        description: photo.text || '',
                        date: photo.date
                    });
                });

                const photosContainer = document.getElementById('photos-container');
                Object.keys(newPhotosByYear).forEach(year => {
                    let yearContainer = document.getElementById(`photos-year-${year}`);

                    if (!yearContainer) {
                        const yearPeriodDiv = document.createElement('div');
                        yearPeriodDiv.className = 'photo_period page_padding';
                        yearPeriodDiv.setAttribute('data-year', year);

                        const delimiter = document.createElement('div');
                        delimiter.className = `photos_period_delimiter photos_period_delimiter_${year}`;
                        delimiter.setAttribute('data-year', year);
                        delimiter.textContent = year;

                        yearContainer = document.createElement('div');
                        yearContainer.className = 'scroll_container album-flex';
                        yearContainer.id = `photos-year-${year}`;

                        yearPeriodDiv.appendChild(delimiter);
                        yearPeriodDiv.appendChild(yearContainer);

                        const existingPeriods = Array.from(photosContainer.querySelectorAll('.photo_period'));
                        let inserted = false;
                        for (let i = 0; i < existingPeriods.length; i++) {
                            const existingYear = parseInt(existingPeriods[i].getAttribute('data-year'));
                            if (year > existingYear) {
                                photosContainer.insertBefore(yearPeriodDiv, existingPeriods[i]);
                                inserted = true;
                                break;
                            }
                        }
                        if (!inserted) {
                            photosContainer.appendChild(yearPeriodDiv);
                        }
                    }

                    newPhotosByYear[year].forEach(photo => {
                        const photoDiv = document.createElement('div');
                        photoDiv.className = 'album-photo scroll_node';
                        photoDiv.setAttribute('data-photo-id', photo.id);

                        const link = document.createElement('a');
                        link.href = `/photo${photo.id}`;
                        link.setAttribute('onclick', `OpenMiniature(event, '${photo.url_large}', null, '${photo.id}', null)`);

                        const img = document.createElement('img');
                        img.className = 'album-photo--image';
                        img.src = photo.url_small;
                        img.alt = photo.description || '';
                        img.loading = 'lazy';

                        link.appendChild(img);
                        photoDiv.appendChild(link);
                        yearContainer.appendChild(photoDiv);
                    });
                });

                photosLoaded += photos.items.length;

                const showMoreContainer = document.getElementById('photos-show-more-container');
                if (photosLoaded < totalPhotos) {
                    showMoreContainer.style.display = 'block';
                } else {
                    showMoreContainer.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error loading photos:', error);
            document.getElementById('photos-loading').innerHTML = 'Error loading photos: ' + error.message;
            document.getElementById('photos-section').style.display = 'block';
        }
    }

    (async function() {
        try {
            await Promise.race([
                loadPhotos(0),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
            ]);
        } catch (error) {
            console.error('Failed to load initial photos:', error);
            document.getElementById('photos-loading').innerHTML = 'Unable to load photos. Please refresh the page.';
            document.getElementById('photos-section').style.display = 'block';
        }
    })();

    const showMoreBtn = document.getElementById('photos-show-more-btn');
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', async function() {
            const originalHTML = showMoreBtn.innerHTML;
            showMoreBtn.innerHTML = '<div class="pr"><div class="pr_bt"></div><div class="pr_bt"></div><div class="pr_bt"></div></div>';
            showMoreBtn.disabled = true;

            try {
                await loadPhotos(photosLoaded);
            } catch (error) {
                console.error('Error loading more photos:', error);
            }

            showMoreBtn.innerHTML = originalHTML;
            showMoreBtn.disabled = false;
        });
    }
};

function showCreateGroupModal() {
    const modalBody = `
        <div class="settings_panel" style="width: 100%; margin: 0;">
            <div class="settings_list_row">
                <div class="settings_label">${tr('name')}</div>
                <div class="settings_labeled_text">
                    <input type="text" name="group_name" id="group_name_input" value="" style="width: 100%;" />
                </div>
            </div>
            <div class="settings_list_row">
                <div class="settings_label">${tr('description')}</div>
                <div class="settings_labeled_text">
                    <textarea name="group_about" id="group_about_input" style="width: 100%; resize: vertical; min-height: 80px;"></textarea>
                </div>
            </div>
        </div>
    `;

    const modal = new CMessageBox({
        title: tr('create_group'),
        body: modalBody,
        buttons: [tr('create'), tr('cancel')],
        callbacks: [
            () => {
                createGroup();
            },
            () => {
                modal.close();
            }
        ],
        close_on_buttons: false,
        warn_on_exit: false
    });

    setTimeout(() => {
        const nameInput = document.getElementById('group_name_input');
        if (nameInput) {
            nameInput.focus();
        }
    }, 100);

    return modal;
}

async function createGroup() {
    const nameInput = document.getElementById('group_name_input');
    const aboutInput = document.getElementById('group_about_input');

    if (!nameInput || !aboutInput) {
        console.error('Group form inputs not found');
        return;
    }

    const groupName = nameInput.value.trim();
    const groupAbout = aboutInput.value.trim();

    if (!groupName || groupName.length === 0) {
        NewNotification(tr('error'), tr('error_no_group_name'), null);
        nameInput.focus();
        return;
    }

    CMessageBox.toggleLoader();

    nameInput.disabled = true;
    aboutInput.disabled = true;

    const csrfToken = window.router.csrf;

    if (!csrfToken) {
        CMessageBox.toggleLoader();
        nameInput.disabled = false;
        aboutInput.disabled = false;
        NewNotification(tr('error'), 'CSRF token not found. Please refresh the page and try again.', null);
        nameInput.focus();
        return;
    }

    const formData = new FormData();
    formData.append('name', groupName);
    formData.append('about', groupAbout);
    formData.append('hash', csrfToken);

    try {
        const response = await fetch('/groups_create', {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        });

        if (response.url && response.url.includes('/club')) {
            CMessageBox.toggleLoader();
            const currentModal = window.messagebox_stack[window.messagebox_stack.length - 1];
            if (currentModal) {
                currentModal.close();
            }
            window.router.route(response.url);
            return;
        }

    } catch (error) {
        console.error('Error creating group:', error);
        CMessageBox.toggleLoader();
        nameInput.disabled = false;
        aboutInput.disabled = false;

        NewNotification(tr('error'), errorMessage, null);
        nameInput.focus();
    }
}

u(document).on('keydown', '#group_name_input, #group_about_input', (e) => {
    if (e.keyCode === 13 && !e.shiftKey) {
        if (e.target.id === 'group_name_input') {
            e.preventDefault();
            const aboutInput = document.getElementById('group_about_input');
            if (aboutInput) {
                aboutInput.focus();
            }
        } else if (e.target.id === 'group_about_input') {
            e.preventDefault();
            createGroup();
        }
    }
});