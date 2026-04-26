(function() {
    if (!window.vkify) return;

    function initAvatarUpload() {
        vkify.bindOnce('avatar-upload-edit', () => {
            u(document).on('click', '._edit_avatar_btn', (e) => {
                e.preventDefault();
                const btn = e.currentTarget;
                const clubId = btn.dataset.club;
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
                        <label style="margin-top: 14px;display: block;">
                            <input id="publish_on_wall" type="checkbox" checked>${tr("publish_on_wall")}
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
                            document.querySelector(".cropper-container")?.classList.add("moving");
                        },
                        cropend() {
                            document.querySelector(".cropper-container")?.classList.remove("moving");
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
                                error: (response) => {
                                    fastError(response.flash?.message || "Upload failed");
                                },
                                success: (response) => {
                                    document.querySelector("#_uploadImg")?.classList.remove("lagged");
                                    u("body").removeClass("dimmed");
                                    document.querySelector("html").style.overflowY = "scroll";
                                    u(".ovk-diag-cont").remove();

                                    if (!response.success) {
                                        fastError(response.flash?.message || "Upload failed");
                                        return;
                                    }

                                    const sidebarImg = document.querySelector(".ui_ownblock_img");
                                    if (sidebarImg) sidebarImg.src = response.url;

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
            });
        });
    }

    vkify.onPage(initAvatarUpload);
})();
