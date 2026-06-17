(function() {
    if (!window.vkify) return;

    function openAvatarUploadModal(btn) {
        const avatarBlock = btn.closest(".avatar_block");
        const clubId = avatarBlock ? avatarBlock.dataset.club : null;
        const isGroup = !!clubId;

        const body = `
        <div id="avatarUpload">
            <p>${isGroup ? tr('groups_avatar') : tr('friends_avatar')}</p>
            <p>${tr('formats_avatar')}</p><br>
            <label class="button" style="margin-left:45%;user-select:none" id="uploadbtn">
                ${tr("browse")}
                <input accept="image/*" type="file" id="_avaInput" name="blob" hidden style="display: none;">
            </label>
            <br><br>
            <p>${tr('troubles_avatar')}</p>
        </div>
        `;

        const msg = MessageBox(tr('uploading_new_image'), body, [tr('cancel')], [() => {}]);
        msg.attr("style", "width: 600px;");
        document.querySelector(".ovk-diag-body").style.padding = "13px";

        $("#avatarUpload input").on("change", (ev) => {
            const image = URL.createObjectURL(ev.currentTarget.files[0]);
            $(".ovk-diag-body")[0].innerHTML = `
                <span>${!isGroup ? tr("selected_area_user") : tr("selected_area_club")}</span>
                <p style="margin-bottom: 10px;">${tr("selected_area_rotate")}</p>
                <div class="cropper-image-cont" style="max-height: 274px;">
                    <img src="${image}" id="temp_uploadPic">
                    <div class="rotateButtons">
                        <div class="_rotateLeft hoverable"></div>
                        <div class="_rotateRight hoverable"></div>
                    </div>
                </div>
                <label class="checkbox" style="margin-top: 14px;">
                    <input id="publish_on_wall" type="checkbox" checked><span>${tr("publish_on_wall")}</span>
                </label>
            `;

            document.querySelector(".ovk-diag-action").insertAdjacentHTML("beforeend", `
                <button class="button" style="margin-left: 4px;" id="_uploadImg">${tr("upload_button")}</button>
            `);

            const imageDiv = document.getElementById('temp_uploadPic');
            const cropper = new Cropper(imageDiv, {
                aspectRatio: NaN,
                zoomable: true,
                minCropBoxWidth: 150,
                minCropBoxHeight: 150,
                dragMode: 'move',
                background: false,
                center: false,
                guides: false,
                modal: true,
                viewMode: 2,
                cropstart() {
                    var cc = document.querySelector(".cropper-container");
                    if (cc) cc.classList.add("moving");
                },
                cropend() {
                    var cc2 = document.querySelector(".cropper-container");
                    if (cc2) cc2.classList.remove("moving");
                },
            });

            msg.attr("style", "width: 487px;");

            document.querySelector("#_uploadImg").onclick = () => {
                cropper.getCroppedCanvas({
                    fillColor: '#fff',
                    imageSmoothingEnabled: false,
                    imageSmoothingQuality: 'high',
                }).toBlob((blob) => {
                    document.querySelector("#_uploadImg").classList.add("lagged");
                    const formdata = new FormData();
                    formdata.append("blob", blob);
                    formdata.append("ajax", 1);
                    formdata.append("on_wall", Number(document.querySelector("#publish_on_wall").checked));
                    formdata.append("hash", vkify.getCsrf());

                    $.ajax({
                        type: "POST",
                        url: isGroup ? "/club" + clubId + "/al_avatar" : "/al_avatars",
                        data: formdata,
                        processData: false,
                        contentType: false,
                        error: (xhr) => {
                            if (document.querySelector("#_uploadImg")) document.querySelector("#_uploadImg").classList.remove("lagged");
                            let errorMsg = "Upload failed";
                            try {
                                const res = JSON.parse(xhr.responseText);
                                errorMsg = (res.flash && res.flash.message) ? res.flash.message : (res.message || errorMsg);
                            } catch (e) {}
                            fastError(errorMsg);
                        },
                        success: (response) => {
                            if (document.querySelector("#_uploadImg")) document.querySelector("#_uploadImg").classList.remove("lagged");
                            u("body").removeClass("dimmed");
                            document.querySelector("html").style.overflowY = "scroll";
                            u(".ovk-diag-cont").remove();

                            if (!response.success) {
                                fastError((response.flash && response.flash.message) ? response.flash.message : "Upload failed");
                                return;
                            }

                            // 1. Update big avatar (profile main photo)
                            const bigAvatar = document.querySelector("#bigAvatar");
                            if (bigAvatar) {
                                bigAvatar.src = response.url;
                                if (bigAvatar.parentNode && bigAvatar.parentNode.tagName === 'A') {
                                    bigAvatar.parentNode.href = "/photo" + response.new_photo;
                                }
                            }

                            // 2. Toggle avatar control buttons visibility on profile page
                            const addImageText = document.querySelector(".add_image_text");
                            if (addImageText) addImageText.style.display = "none";
                            const avatarControls = document.querySelector(".avatar_controls");
                            if (avatarControls) avatarControls.style.display = "block";

                            // 3. Update global top menu and sidebar avatars for the current user
                            if (!isGroup) {
                                const sidebarImg = document.querySelector(".ui_ownblock_img");
                                if (sidebarImg) sidebarImg.src = response.url;

                                const menuAvatar = document.querySelector("#userMenuAvatar");
                                if (menuAvatar) menuAvatar.src = response.url;
                            }

                            // 4. Update post/comment/list avatars for this entity, verifying they are actual avatars
                            const entityUrl = isGroup ? `/club${clubId}` : `/id${(window.openvk && window.openvk.current_id) ? window.openvk.current_id : ''}`;
                            const links = document.querySelectorAll(`a[href="${entityUrl}"], a[href="/${entityUrl.substring(1)}"]`);
                            links.forEach(link => {
                                const img = link.querySelector('img');
                                if (img) {
                                    const isAvatar = img.classList.contains('post-avatar') ||
                                                     img.classList.contains('reply_img') ||
                                                     img.classList.contains('cell_img') ||
                                                     img.classList.contains('people_cell_img') ||
                                                     img.closest('.people_cell_img') ||
                                                     img.closest('.search_row .img') ||
                                                     img.classList.contains('ui_ownblock_img') ||
                                                     img.classList.contains('post_field_user_image') ||
                                                     img.classList.contains('feedback_image') ||
                                                     img.closest('.feedback_image') ||
                                                     img.id === 'userMenuAvatar' ||
                                                     img.id === 'bigAvatar';
                                    if (isAvatar) {
                                        img.src = response.url;
                                    }
                                }
                            });

                            if (window.vkifyShowSavedLabel) {
                                const form = btn.closest('form') || btn.closest('.page_block');
                                if (form) vkifyShowSavedLabel(form);
                            }
                        }
                    });
                });
            };

            $(".ovk-diag-body ._rotateLeft").on("click", () => cropper.rotate(90));
            $(".ovk-diag-body ._rotateRight").on("click", () => cropper.rotate(-90));
        });
    }

    function initAvatarUpload() {
        vkify.bindOnce('avatar-upload-edit-v2', () => {
            document.addEventListener('click', (e) => {
                const target = e.target.closest('#vkify_add_image, #add_image, ._add_image, .add_image_text, ._edit_avatar_btn');
                if (target) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    openAvatarUploadModal(target);
                }
            }, true);
        });
    }

    vkify.onPage(initAvatarUpload);
})();
