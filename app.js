
/* =========================================================
   AUTHENTICATION
========================================================= */

async function getCurrentUser() {
    const response = await fetch("/api/auth/me", { credentials: "include" });
    if (!response.ok) throw new Error("Not authenticated");
    const data = await response.json();
    return data.user;
}

async function logoutUser() {
    try {
        await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include"
        });
    } finally {
        window.location.href = "/";
    }
}

async function requireAuthentication() {
    try {
        const user = await getCurrentUser();
        const greeting = document.getElementById("userGreeting");
        if (greeting) greeting.textContent = `Hi, ${user.name}`;
        return true;
    } catch (_) {
        window.location.href = "/";
        return false;
    }
}

/* =========================================================
   FILEFORGE
   Image + PDF Utility Platform
   No PDF Editing
========================================================= */

const workspaceSection = document.getElementById("workspace");
const workspaceTitle = document.getElementById("toolTitle");
const workspaceDescription = document.getElementById("toolDescription");
const toolContent = document.getElementById("toolContent");

let currentTool = null;

let currentImage = null;
let currentImageFile = null;
let currentOutputBlob = null;
let currentOutputName = "";


/* =========================================================
   GENERAL
========================================================= */

function scrollToTools() {
    document.getElementById("tools").scrollIntoView({
        behavior: "smooth"
    });
}

function showHome() {
    closeTool();
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function openTool(tool) {

    currentTool = tool;

    workspaceSection.classList.add("active");

    const configs = {

        compress: {
            title: "Compress Image",
            description: "Reduce image file size while preserving excellent visual quality."
        },

        resize: {
            title: "Resize Image",
            description: "Change image dimensions while preserving image quality."
        },

        convert: {
            title: "Convert Image",
            description: "Convert between JPG, PNG and WebP using high-quality rendering."
        },

        optimize: {
            title: "Optimize Image",
            description: "Resize, compress and convert your image in one workflow."
        },

        crop: {
            title: "Crop Image",
            description: "Crop your image precisely."
        },

        rotate: {
            title: "Rotate & Flip",
            description: "Rotate or flip your image."
        },

        "image-pdf": {
            title: "Image to PDF",
            description: "Convert one or multiple images into a PDF."
        },

        "merge-pdf": {
            title: "Merge PDF",
            description: "Combine multiple PDF files into one."
        },

        "split-pdf": {
            title: "Split PDF",
            description: "Extract selected pages from a PDF."
        },

        "pdf-compress": {
            title: "Compress PDF",
            description: "Reduce PDF file size where browser-side processing allows."
        },

        "pdf-jpg": {
            title: "PDF to JPG",
            description: "Convert PDF pages into high-resolution JPG images."
        },

        "pdf-png": {
            title: "PDF to PNG",
            description: "Convert PDF pages into high-resolution PNG images."
        }
    };

    workspaceTitle.textContent = configs[tool].title;
    workspaceDescription.textContent = configs[tool].description;

    renderTool(tool);

    setTimeout(() => {
        workspaceSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }, 50);
}


function closeTool() {
    workspaceSection.classList.remove("active");
    toolContent.innerHTML = "";
    currentImage = null;
    currentImageFile = null;
    currentOutputBlob = null;
}


/* =========================================================
   FILE HELPERS
========================================================= */

function formatBytes(bytes) {

    if (!bytes) return "0 B";

    const units = ["B", "KB", "MB", "GB"];

    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return (
        (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)
        + " "
        + units[i]
    );
}


function createObjectURL(file) {
    return URL.createObjectURL(file);
}


function revokeURL(url) {
    if (url) {
        try {
            URL.revokeObjectURL(url);
        } catch {}
    }
}


function downloadBlob(blob, filename) {

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = filename;

    document.body.appendChild(a);

    a.click();

    a.remove();

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);
}


/* =========================================================
   FILE UPLOAD UI
========================================================= */

function uploadArea({
    id = "fileUpload",
    multiple = false,
    accept = "image/*",
    text = "Drop your file here",
    subtext = "or choose a file"
}) {

    return `
        <div class="tool-content">

            <div class="dropzone" id="${id}">

                <div>

                    <div class="upload-icon">↑</div>

                    <h3>${text}</h3>

                    <p>${subtext}</p>

                    <label class="choose-btn">

                        Choose File

                        <input
                            class="file-input"
                            id="${id}Input"
                            type="file"
                            accept="${accept}"
                            ${multiple ? "multiple" : ""}
                        >

                    </label>

                </div>

            </div>

            <div id="${id}Files"></div>

        </div>
    `;
}


function setupDropzone(id, callback) {

    const zone = document.getElementById(id);
    const input = document.getElementById(id + "Input");

    input.addEventListener("change", e => {

        callback([...e.target.files]);

    });

    zone.addEventListener("dragover", e => {

        e.preventDefault();

        zone.classList.add("dragging");

    });

    zone.addEventListener("dragleave", () => {

        zone.classList.remove("dragging");

    });

    zone.addEventListener("drop", e => {

        e.preventDefault();

        zone.classList.remove("dragging");

        callback([...e.dataTransfer.files]);

    });
}


/* =========================================================
   IMAGE LOADING
========================================================= */

function loadImage(file) {

    return new Promise((resolve, reject) => {

        const url = URL.createObjectURL(file);

        const img = new Image();

        img.onload = () => {

            URL.revokeObjectURL(url);

            resolve(img);

        };

        img.onerror = reject;

        img.src = url;

    });
}


/* =========================================================
   HIGH QUALITY CANVAS
========================================================= */

function createHighQualityCanvas(width, height) {

    const canvas = document.createElement("canvas");

    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));

    const ctx = canvas.getContext("2d", {
        alpha: true,
        desynchronized: false
    });

    /*
        IMPORTANT:

        High-quality browser image scaling.
    */

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    return {
        canvas,
        ctx
    };
}


/* =========================================================
   IMAGE ENCODING
========================================================= */

function canvasToBlob(canvas, type, quality = 1) {

    return new Promise((resolve, reject) => {

        canvas.toBlob(
            blob => {

                if (!blob) {
                    reject(new Error("Could not create image."));
                    return;
                }

                resolve(blob);

            },
            type,
            quality
        );

    });
}


/*
    IMPORTANT QUALITY RULE:

    We use very high quality by default.

    JPEG/WebP:
    0.98 = 98%

    PNG:
    Lossless. Quality parameter ignored.
*/

async function encodeImage(
    img,
    width,
    height,
    format = "image/jpeg",
    quality = 0.98
) {

    const {
        canvas,
        ctx
    } = createHighQualityCanvas(width, height);


    /*
        White background is ONLY necessary for JPEG
        because JPEG does not support transparency.
    */

    if (format === "image/jpeg") {

        ctx.fillStyle = "#ffffff";

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

    }


    ctx.drawImage(
        img,
        0,
        0,
        canvas.width,
        canvas.height
    );


    /*
        PNG is lossless.

        Never use a low quality value for PNG.
    */

    if (format === "image/png") {

        return canvasToBlob(
            canvas,
            "image/png"
        );
    }


    return canvasToBlob(
        canvas,
        format,
        quality
    );
}


/* =========================================================
   IMAGE COMPRESSOR
========================================================= */

function renderCompress() {

    toolContent.innerHTML = uploadArea({
        id: "compressUpload",
        accept: "image/jpeg,image/png,image/webp",
        text: "Drop your image here",
        subtext: "JPG, PNG or WebP"
    });

    setupDropzone(
        "compressUpload",
        files => {

            if (!files.length) return;

            handleCompress(files[0]);

        }
    );
}


async function handleCompress(file) {

    try {

        currentImageFile = file;

        currentImage = await loadImage(file);

        const width = currentImage.naturalWidth;
        const height = currentImage.naturalHeight;

        toolContent.innerHTML = `

            <div class="quality-notice">

                <strong>High-quality compression</strong><br>

                The image dimensions will remain unchanged.
                Use the quality slider only when you want a smaller file.

                PNG output remains lossless.

            </div>

            <div class="preview-layout">

                <div class="preview-box">

                    <img
                        id="compressPreview"
                        src="${URL.createObjectURL(file)}"
                    >

                </div>

                <div class="settings">

                    <h3>Compression</h3>

                    <div class="field">

                        <label>Output Format</label>

                        <select id="compressFormat">

                            <option value="original">
                                Keep Original Format
                            </option>

                            <option value="image/jpeg">
                                JPG
                            </option>

                            <option value="image/webp">
                                WebP
                            </option>

                            <option value="image/png">
                                PNG
                            </option>

                        </select>

                    </div>


                    <div class="field">

                        <label>Quality</label>

                        <input
                            id="compressQuality"
                            type="range"
                            min="50"
                            max="100"
                            value="100"
                        >

                        <div class="range-value">
                            <span id="qualityValue">100</span>%
                        </div>

                    </div>


                    <div class="field">

                        <label>Dimensions</label>

                        <div class="stats">

                            <div class="stat">

                                <span>Width</span>

                                <strong>${width}px</strong>

                            </div>

                            <div class="stat">

                                <span>Height</span>

                                <strong>${height}px</strong>

                            </div>

                        </div>

                    </div>


                    <button
                        class="action-btn"
                        onclick="compressCurrentImage()"
                    >
                        Compress Image
                    </button>

                </div>

            </div>

            <div id="compressResult"></div>
        `;


        const qualitySlider =
            document.getElementById("compressQuality");

        const qualityValue =
            document.getElementById("qualityValue");

        qualitySlider.addEventListener(
            "input",
            () => {

                qualityValue.textContent =
                    qualitySlider.value;

            }
        );

    } catch (error) {

        showError(error);

    }
}


async function compressCurrentImage() {

    try {

        const formatSelect =
            document.getElementById("compressFormat");

        const quality =
            Number(
                document.getElementById("compressQuality").value
            ) / 100;

        let format =
            formatSelect.value;


        /*
            Keep original format.

            This avoids unnecessary format conversion.
        */

        if (format === "original") {

            format =
                currentImageFile.type || "image/jpeg";

        }


        /*
            If PNG is selected, compression is lossless.
        */

        const outputQuality =
            format === "image/png"
                ? 1
                : Math.max(0.5, Math.min(1, quality));


        const blob =
            await encodeImage(
                currentImage,
                currentImage.naturalWidth,
                currentImage.naturalHeight,
                format,
                outputQuality
            );


        currentOutputBlob = blob;


        const extension =
            format === "image/png"
                ? "png"
                : format === "image/webp"
                    ? "webp"
                    : "jpg";


        currentOutputName =
            "fileforge-compressed." + extension;


        showImageResult(
            "compressResult",
            currentImageFile,
            blob,
            currentOutputName
        );

    } catch (error) {

        showError(error);

    }
}


/* =========================================================
   IMAGE RESIZER
========================================================= */

function renderResize() {

    toolContent.innerHTML = uploadArea({
        id: "resizeUpload",
        accept: "image/jpeg,image/png,image/webp",
        text: "Drop an image to resize",
        subtext: "JPG, PNG or WebP"
    });

    setupDropzone(
        "resizeUpload",
        files => {

            if (!files.length) return;

            handleResize(files[0]);

        }
    );
}


async function handleResize(file) {

    currentImageFile = file;

    currentImage =
        await loadImage(file);

    const width =
        currentImage.naturalWidth;

    const height =
        currentImage.naturalHeight;

    toolContent.innerHTML = `

        <div class="preview-layout">

            <div class="preview-box">

                <img
                    id="resizePreview"
                    src="${URL.createObjectURL(file)}"
                >

            </div>

            <div class="settings">

                <h3>Resize Image</h3>

                <div class="field">

                    <label>Width</label>

                    <input
                        id="resizeWidth"
                        type="number"
                        value="${width}"
                        min="1"
                    >

                </div>

                <div class="field">

                    <label>Height</label>

                    <input
                        id="resizeHeight"
                        type="number"
                        value="${height}"
                        min="1"
                    >

                </div>

                <label class="checkbox">

                    <input
                        id="lockRatio"
                        type="checkbox"
                        checked
                    >

                    Lock aspect ratio

                </label>


                <div class="field">

                    <label>Output Format</label>

                    <select id="resizeFormat">

                        <option value="${file.type}">
                            Keep Original
                        </option>

                        <option value="image/jpeg">
                            JPG
                        </option>

                        <option value="image/png">
                            PNG
                        </option>

                        <option value="image/webp">
                            WebP
                        </option>

                    </select>

                </div>


                <div class="field">

                    <label>Quality</label>

                    <input
                        id="resizeQuality"
                        type="range"
                        min="80"
                        max="100"
                        value="100"
                    >

                    <div class="range-value">

                        <span id="resizeQualityValue">
                            98
                        </span>%

                    </div>

                </div>


                <button
                    class="action-btn"
                    onclick="resizeCurrentImage()"
                >
                    Resize & Download
                </button>

            </div>

        </div>

        <div id="resizeResult"></div>
    `;


    const widthInput =
        document.getElementById("resizeWidth");

    const heightInput =
        document.getElementById("resizeHeight");

    const lock =
        document.getElementById("lockRatio");


    widthInput.addEventListener(
        "input",
        () => {

            if (!lock.checked) return;

            const ratio =
                width / height;

            heightInput.value =
                Math.round(
                    Number(widthInput.value) / ratio
                );

        }
    );


    heightInput.addEventListener(
        "input",
        () => {

            if (!lock.checked) return;

            const ratio =
                width / height;

            widthInput.value =
                Math.round(
                    Number(heightInput.value) * ratio
                );

        }
    );


    document
        .getElementById("resizeQuality")
        .addEventListener(
            "input",
            e => {

                document
                    .getElementById("resizeQualityValue")
                    .textContent = e.target.value;

            }
        );
}


async function resizeCurrentImage() {

    const width =
        Number(
            document.getElementById("resizeWidth").value
        );

    const height =
        Number(
            document.getElementById("resizeHeight").value
        );


    if (
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
    ) {

        alert("Enter valid dimensions.");

        return;
    }


    let format =
        document.getElementById("resizeFormat").value;


    if (format === "image/jpeg" &&
        currentImageFile.type === "image/png") {

        /*
            User explicitly chose JPG.
            JPEG cannot preserve transparency.
        */

    }


    const quality =
        Number(
            document.getElementById("resizeQuality").value
        ) / 100;


    const blob =
        await encodeImage(
            currentImage,
            width,
            height,
            format,
            format === "image/png"
                ? 1
                : quality
        );


    currentOutputBlob = blob;


    const extension =
        format === "image/png"
            ? "png"
            : format === "image/webp"
                ? "webp"
                : "jpg";


    currentOutputName =
        "fileforge-resized." + extension;


    showImageResult(
        "resizeResult",
        currentImageFile,
        blob,
        currentOutputName
    );
}


/* =========================================================
   IMAGE CONVERTER
========================================================= */

function renderConvert() {

    toolContent.innerHTML = uploadArea({
        id: "convertUpload",
        accept: "image/jpeg,image/png,image/webp",
        text: "Drop an image to convert",
        subtext: "JPG, PNG or WebP"
    });

    setupDropzone(
        "convertUpload",
        files => {

            if (!files.length) return;

            handleConvert(files[0]);

        }
    );
}


async function handleConvert(file) {

    currentImageFile = file;

    currentImage =
        await loadImage(file);


    toolContent.innerHTML = `

        <div class="quality-notice">

            <strong>Maximum quality mode</strong><br>

            Conversion keeps the original image dimensions.
            JPG/WebP uses 98% quality by default.
            PNG remains lossless.

        </div>


        <div class="preview-layout">

            <div class="preview-box">

                <img
                    src="${URL.createObjectURL(file)}"
                >

            </div>


            <div class="settings">

                <h3>Convert Image</h3>

                <div class="field">

                    <label>Convert To</label>

                    <select id="convertFormat">

                        <option value="image/png">
                            PNG — Lossless
                        </option>

                        <option value="image/jpeg">
                            JPG — 100% Quality
                        </option>

                        <option value="image/webp">
                            WebP — 100% Quality
                        </option>

                    </select>

                </div>


                <div class="field">

                    <label>Quality</label>

                    <input
                        id="convertQuality"
                        type="range"
                        min="80"
                        max="100"
                        value="100"
                    >

                    <div class="range-value">
                        <span id="convertQualityValue">
                            100
                        </span>%
                    </div>

                </div>


                <div class="field">

                    <label>Original Dimensions</label>

                    <div class="stats">

                        <div class="stat">

                            <span>Width</span>

                            <strong>
                                ${currentImage.naturalWidth}px
                            </strong>

                        </div>

                        <div class="stat">

                            <span>Height</span>

                            <strong>
                                ${currentImage.naturalHeight}px
                            </strong>

                        </div>

                    </div>

                </div>


                <button
                    class="action-btn"
                    onclick="convertCurrentImage()"
                >
                    Convert Image
                </button>

            </div>

        </div>


        <div id="convertResult"></div>
    `;


    const slider =
        document.getElementById("convertQuality");

    const value =
        document.getElementById("convertQualityValue");


    slider.addEventListener(
        "input",
        () => {

            value.textContent =
                slider.value;

        }
    );


    document
        .getElementById("convertFormat")
        .addEventListener(
            "change",
            e => {

                if (e.target.value === "image/png") {

                    slider.disabled = true;

                    slider.value = 100;

                    value.textContent = "Lossless";

                } else {

                    slider.disabled = false;

                    slider.value = 98;

                    value.textContent = "98";

                }

            }
        );
}


async function convertCurrentImage() {

    const format =
        document.getElementById("convertFormat").value;


    const quality =
        Number(
            document.getElementById("convertQuality").value
        ) / 100;


    const blob =
        await encodeImage(
            currentImage,
            currentImage.naturalWidth,
            currentImage.naturalHeight,
            format,
            format === "image/png"
                ? 1
                : quality
        );


    currentOutputBlob = blob;


    const extension =
        format === "image/png"
            ? "png"
            : format === "image/webp"
                ? "webp"
                : "jpg";


    currentOutputName =
        "fileforge-converted." + extension;


    showImageResult(
        "convertResult",
        currentImageFile,
        blob,
        currentOutputName
    );
}


/* =========================================================
   IMAGE OPTIMIZER
========================================================= */

function renderOptimize() {

    toolContent.innerHTML = uploadArea({
        id: "optimizeUpload",
        accept: "image/jpeg,image/png,image/webp",
        text: "Drop an image to optimize",
        subtext: "Resize + compress + convert"
    });


    setupDropzone(
        "optimizeUpload",
        files => {

            if (!files.length) return;

            handleOptimize(files[0]);

        }
    );
}


async function handleOptimize(file) {

    currentImageFile = file;

    currentImage =
        await loadImage(file);


    const width =
        currentImage.naturalWidth;

    const height =
        currentImage.naturalHeight;


    toolContent.innerHTML = `

        <div class="preview-layout">

            <div class="preview-box">

                <img
                    src="${URL.createObjectURL(file)}"
                >

            </div>


            <div class="settings">

                <h3>Optimize Image</h3>

                <div class="field">

                    <label>Width</label>

                    <input
                        id="optWidth"
                        type="number"
                        value="${width}"
                    >

                </div>


                <div class="field">

                    <label>Height</label>

                    <input
                        id="optHeight"
                        type="number"
                        value="${height}"
                    >

                </div>


                <label class="checkbox">

                    <input
                        id="optRatio"
                        type="checkbox"
                        checked
                    >

                    Lock aspect ratio

                </label>


                <div class="field">

                    <label>Format</label>

                    <select id="optFormat">

                        <option value="image/webp">
                            WebP
                        </option>

                        <option value="image/jpeg">
                            JPG
                        </option>

                        <option value="image/png">
                            PNG Lossless
                        </option>

                    </select>

                </div>


                <div class="field">

                    <label>Quality</label>

                    <input
                        id="optQuality"
                        type="range"
                        min="70"
                        max="100"
                        value="95"
                    >

                    <div class="range-value">
                        <span id="optQualityValue">95</span>%
                    </div>

                </div>


                <button
                    class="action-btn"
                    onclick="optimizeCurrentImage()"
                >
                    Optimize Image
                </button>

            </div>

        </div>


        <div id="optimizeResult"></div>
    `;


    const widthInput =
        document.getElementById("optWidth");

    const heightInput =
        document.getElementById("optHeight");

    const ratio =
        document.getElementById("optRatio");


    widthInput.addEventListener(
        "input",
        () => {

            if (!ratio.checked) return;

            heightInput.value =
                Math.round(
                    Number(widthInput.value) *
                    height / width
                );

        }
    );


    heightInput.addEventListener(
        "input",
        () => {

            if (!ratio.checked) return;

            widthInput.value =
                Math.round(
                    Number(heightInput.value) *
                    width / height
                );

        }
    );


    document
        .getElementById("optQuality")
        .addEventListener(
            "input",
            e => {

                document
                    .getElementById("optQualityValue")
                    .textContent =
                    e.target.value;

            }
        );
}


async function optimizeCurrentImage() {

    const width =
        Number(
            document.getElementById("optWidth").value
        );

    const height =
        Number(
            document.getElementById("optHeight").value
        );

    const format =
        document.getElementById("optFormat").value;

    const quality =
        Number(
            document.getElementById("optQuality").value
        ) / 100;


    const blob =
        await encodeImage(
            currentImage,
            width,
            height,
            format,
            format === "image/png"
                ? 1
                : quality
        );


    const extension =
        format === "image/png"
            ? "png"
            : format === "image/webp"
                ? "webp"
                : "jpg";


    currentOutputBlob = blob;

    currentOutputName =
        "fileforge-optimized." + extension;


    showImageResult(
        "optimizeResult",
        currentImageFile,
        blob,
        currentOutputName
    );
}


/* =========================================================
   CROP
========================================================= */

function renderCrop() {

    toolContent.innerHTML = uploadArea({
        id: "cropUpload",
        accept: "image/jpeg,image/png,image/webp",
        text: "Drop an image to crop",
        subtext: "JPG, PNG or WebP"
    });

    setupDropzone(
        "cropUpload",
        files => {

            if (!files.length) return;

            handleCrop(files[0]);

        }
    );
}


async function handleCrop(file) {

    currentImageFile = file;

    currentImage =
        await loadImage(file);


    const width =
        currentImage.naturalWidth;

    const height =
        currentImage.naturalHeight;


    toolContent.innerHTML = `

        <div class="preview-layout">

            <div class="preview-box">

                <img
                    id="cropImage"
                    src="${URL.createObjectURL(file)}"
                >

            </div>

            <div class="settings">

                <h3>Crop Image</h3>

                <div class="field">

                    <label>Crop Width</label>

                    <input
                        id="cropWidth"
                        type="number"
                        value="${Math.round(width * .8)}"
                    >

                </div>

                <div class="field">

                    <label>Crop Height</label>

                    <input
                        id="cropHeight"
                        type="number"
                        value="${Math.round(height * .8)}"
                    >

                </div>

                <p style="font-size:13px;color:#667085;margin-bottom:15px;">
                    This basic crop tool crops from the center of the image.
                </p>

                <button
                    class="action-btn"
                    onclick="cropCurrentImage()"
                >
                    Crop & Download
                </button>

            </div>

        </div>

        <div id="cropResult"></div>
    `;
}


async function cropCurrentImage() {

    const cropWidth =
        Number(
            document.getElementById("cropWidth").value
        );

    const cropHeight =
        Number(
            document.getElementById("cropHeight").value
        );


    if (
        cropWidth <= 0 ||
        cropHeight <= 0 ||
        cropWidth > currentImage.naturalWidth ||
        cropHeight > currentImage.naturalHeight
    ) {

        alert("Invalid crop dimensions.");

        return;
    }


    const sourceX =
        (currentImage.naturalWidth - cropWidth) / 2;

    const sourceY =
        (currentImage.naturalHeight - cropHeight) / 2;


    const {
        canvas,
        ctx
    } =
        createHighQualityCanvas(
            cropWidth,
            cropHeight
        );


    ctx.drawImage(
        currentImage,
        sourceX,
        sourceY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
    );


    const format =
        currentImageFile.type || "image/jpeg";


    const blob =
        await canvasToBlob(
            canvas,
            format,
            format === "image/png" ? 1 : .98
        );


    currentOutputBlob = blob;


    const extension =
        format === "image/png"
            ? "png"
            : format === "image/webp"
                ? "webp"
                : "jpg";


    currentOutputName =
        "fileforge-cropped." + extension;


    showImageResult(
        "cropResult",
        currentImageFile,
        blob,
        currentOutputName
    );
}


/* =========================================================
   ROTATE & FLIP
========================================================= */

function renderRotate() {

    toolContent.innerHTML = uploadArea({
        id: "rotateUpload",
        accept: "image/jpeg,image/png,image/webp",
        text: "Drop an image",
        subtext: "JPG, PNG or WebP"
    });

    setupDropzone(
        "rotateUpload",
        files => {

            if (!files.length) return;

            handleRotate(files[0]);

        }
    );
}


async function handleRotate(file) {

    currentImageFile = file;

    currentImage =
        await loadImage(file);


    toolContent.innerHTML = `

        <div class="preview-layout">

            <div class="preview-box">

                <img
                    id="rotatePreview"
                    src="${URL.createObjectURL(file)}"
                >

            </div>

            <div class="settings">

                <h3>Rotate & Flip</h3>

                <button
                    class="secondary-action"
                    onclick="rotateImage(90)"
                >
                    Rotate 90° Right
                </button>

                <button
                    class="secondary-action"
                    onclick="rotateImage(-90)"
                >
                    Rotate 90° Left
                </button>

                <button
                    class="secondary-action"
                    onclick="rotateImage(180)"
                >
                    Rotate 180°
                </button>

                <button
                    class="secondary-action"
                    onclick="flipImage(true)"
                >
                    Flip Horizontal
                </button>

                <button
                    class="secondary-action"
                    onclick="flipImage(false)"
                >
                    Flip Vertical
                </button>

                <button
                    class="action-btn"
                    onclick="downloadRotated()"
                >
                    Apply & Download
                </button>

            </div>

        </div>

        <div id="rotateResult"></div>
    `;


    window.rotation = 0;
    window.flipX = false;
    window.flipY = false;
}


function rotateImage(degrees) {

    window.rotation += degrees;

    updateRotatePreview();

}


function flipImage(horizontal) {

    if (horizontal) {

        window.flipX = !window.flipX;

    } else {

        window.flipY = !window.flipY;

    }

    updateRotatePreview();
}


function updateRotatePreview() {

    const img =
        document.getElementById("rotatePreview");

    if (!img) return;


    img.style.transform = `
        rotate(${window.rotation}deg)
        scaleX(${window.flipX ? -1 : 1})
        scaleY(${window.flipY ? -1 : 1})
    `;
}


async function downloadRotated() {

    let angle =
        ((window.rotation % 360) + 360) % 360;


    const swap =
        angle === 90 ||
        angle === 270;


    const width =
        swap
            ? currentImage.naturalHeight
            : currentImage.naturalWidth;


    const height =
        swap
            ? currentImage.naturalWidth
            : currentImage.naturalHeight;


    const {
        canvas,
        ctx
    } =
        createHighQualityCanvas(
            width,
            height
        );


    ctx.save();

    ctx.translate(
        width / 2,
        height / 2
    );

    ctx.rotate(
        window.rotation * Math.PI / 180
    );

    ctx.scale(
        window.flipX ? -1 : 1,
        window.flipY ? -1 : 1
    );


    ctx.drawImage(
        currentImage,
        -currentImage.naturalWidth / 2,
        -currentImage.naturalHeight / 2
    );


    ctx.restore();


    const format =
        currentImageFile.type || "image/jpeg";


    const blob =
        await canvasToBlob(
            canvas,
            format,
            format === "image/png"
                ? 1
                : .98
        );


    currentOutputBlob = blob;


    const extension =
        format === "image/png"
            ? "png"
            : format === "image/webp"
                ? "webp"
                : "jpg";


    currentOutputName =
        "fileforge-rotated." + extension;


    showImageResult(
        "rotateResult",
        currentImageFile,
        blob,
        currentOutputName
    );
}


/* =========================================================
   RESULT
========================================================= */

function showImageResult(
    containerId,
    originalFile,
    blob,
    filename
) {

    const container =
        document.getElementById(containerId);

    if (!container) return;


    const saved =
        originalFile.size > blob.size
            ? (
                (1 - blob.size / originalFile.size) *
                100
            ).toFixed(1)
            : 0;


    container.innerHTML = `

        <div class="result-card">

            <h3>✓ Your image is ready</h3>

            <div class="stats">

                <div class="stat">

                    <span>Original</span>

                    <strong>
                        ${formatBytes(originalFile.size)}
                    </strong>

                </div>


                <div class="stat">

                    <span>New Size</span>

                    <strong>
                        ${formatBytes(blob.size)}
                    </strong>

                </div>


                <div class="stat">

                    <span>Saved</span>

                    <strong>
                        ${saved > 0 ? saved + "%" : "0%"}
                    </strong>

                </div>

            </div>


            <button
                class="action-btn download-btn"
                onclick="downloadBlob(
                    currentOutputBlob,
                    currentOutputName
                )"
            >
                Download ${filename}
            </button>

        </div>
    `;
}


/* =========================================================
   ERROR
========================================================= */

function showError(error) {

    console.error(error);

    toolContent.innerHTML += `

        <div
            style="
                margin-top:20px;
                padding:15px;
                border-radius:10px;
                background:#fef2f2;
                border:1px solid #fecaca;
                color:#991b1b;
            "
        >

            Something went wrong while processing the file.

            Please try another file.

        </div>
    `;
}


/* =========================================================
   TOOL ROUTER
========================================================= */

function renderTool(tool) {

    switch (tool) {

        case "compress":
            renderCompress();
            break;

        case "resize":
            renderResize();
            break;

        case "convert":
            renderConvert();
            break;

        case "optimize":
            renderOptimize();
            break;

        case "crop":
            renderCrop();
            break;

        case "rotate":
            renderRotate();
            break;

        case "image-pdf":
            renderImagePDF();
            break;

        case "merge-pdf":
            renderMergePDF();
            break;

        case "split-pdf":
            renderSplitPDF();
            break;

        case "pdf-compress":
            renderPDFCompress();
            break;

        case "pdf-jpg":
            renderPDFToImage("jpg");
            break;

        case "pdf-png":
            renderPDFToImage("png");
            break;

        default:
            renderCompress();

    }
}


/* =========================================================
   IMAGE → PDF
========================================================= */

function renderImagePDF() {

    toolContent.innerHTML = uploadArea({
        id: "imagePDFUpload",
        multiple: true,
        accept: "image/jpeg,image/png,image/webp",
        text: "Drop images here",
        subtext: "JPG, PNG or WebP"
    });


    setupDropzone(
        "imagePDFUpload",
        files => {

            renderImagePDFFiles(files);

        }
    );
}


async function renderImagePDFFiles(files) {

    const valid =
        files.filter(
            file =>
                file.type.startsWith("image/")
        );


    const container =
        document.getElementById(
            "imagePDFFiles"
        );


    if (!valid.length) {

        container.innerHTML =
            "<p>Choose valid image files.</p>";

        return;
    }


    window.imagePDFFiles = valid;


    container.innerHTML = `

        <div class="file-list">

            ${valid.map(
                (file, index) => `

                    <div class="file-item">

                        <div class="file-info">

                            <img
                                class="file-thumb"
                                src="${URL.createObjectURL(file)}"
                            >

                            <div>

                                <strong>
                                    ${file.name}
                                </strong>

                                <small>
                                    ${formatBytes(file.size)}
                                </small>

                            </div>

                        </div>

                    </div>
                `
            ).join("")}

        </div>


        <button
            class="action-btn"
            onclick="createImagePDF()"
        >
            Create PDF
        </button>
    `;
}


async function createImagePDF() {

    const {
        PDFDocument
    } = PDFLib;


    const pdf =
        await PDFDocument.create();


    for (const file of window.imagePDFFiles) {

        const bytes =
            await file.arrayBuffer();


        let image;


        if (file.type === "image/png") {

            image =
                await pdf.embedPng(bytes);

        } else if (file.type === "image/jpeg") {

            image =
                await pdf.embedJpg(bytes);

        } else if (file.type === "image/webp") {

            /*
                pdf-lib cannot directly embed WebP. Convert WebP
                to lossless PNG at its original dimensions rather
                than sending it through a low-quality JPEG step.
            */
            const webpImage = await loadImage(file);
            const encodedPng = await encodeImage(
                webpImage,
                webpImage.naturalWidth,
                webpImage.naturalHeight,
                "image/png",
                1
            );
            image = await pdf.embedPng(await encodedPng.arrayBuffer());

        } else {
            continue;
        }


        const page =
            pdf.addPage([
                image.width,
                image.height
            ]);


        page.drawImage(
            image,
            {
                x: 0,
                y: 0,
                width: image.width,
                height: image.height
            }
        );
    }


    const bytes =
        await pdf.save();


    const blob =
        new Blob(
            [bytes],
            {
                type: "application/pdf"
            }
        );


    downloadBlob(
        blob,
        "fileforge-images.pdf"
    );
}


/* =========================================================
   PDF TOOLS
   Basic implementations
========================================================= */

function renderMergePDF() {

    toolContent.innerHTML = uploadArea({
        id: "mergePDFUpload",
        multiple: true,
        accept: "application/pdf",
        text: "Drop PDF files here",
        subtext: "Select multiple PDFs"
    });


    setupDropzone(
        "mergePDFUpload",
        files => {

            window.mergeFiles =
                files.filter(
                    f =>
                        f.type === "application/pdf"
                );


            document.getElementById(
                "mergePDFFiles"
            ).innerHTML = `

                <div class="file-list">

                    ${window.mergeFiles.map(
                        file => `

                            <div class="file-item">

                                <div class="file-info">

                                    <div
                                        class="file-thumb"
                                        style="
                                            display:grid;
                                            place-items:center;
                                            font-weight:700;
                                        "
                                    >
                                        PDF
                                    </div>

                                    <div>

                                        <strong>
                                            ${file.name}
                                        </strong>

                                        <small>
                                            ${formatBytes(file.size)}
                                        </small>

                                    </div>

                                </div>

                            </div>
                        `
                    ).join("")}

                </div>

                <button
                    class="action-btn"
                    onclick="mergePDFs()"
                >
                    Merge PDFs
                </button>
            `;

        }
    );
}


async function mergePDFs() {

    const merged =
        await PDFLib.PDFDocument.create();


    for (
        const file of window.mergeFiles
    ) {

        const bytes =
            await file.arrayBuffer();

        const source =
            await PDFLib.PDFDocument.load(bytes);

        const pages =
            await merged.copyPages(
                source,
                source.getPageIndices()
            );

        pages.forEach(
            page => merged.addPage(page)
        );
    }


    const bytes =
        await merged.save();


    downloadBlob(
        new Blob(
            [bytes],
            {type: "application/pdf"}
        ),
        "fileforge-merged.pdf"
    );
}


/* =========================================================
   SPLIT PDF
========================================================= */

function renderSplitPDF() {

    toolContent.innerHTML = uploadArea({
        id: "splitPDFUpload",
        accept: "application/pdf",
        text: "Drop a PDF here",
        subtext: "Select pages to extract"
    });


    setupDropzone(
        "splitPDFUpload",
        files => {

            if (!files.length) return;

            window.splitPDFFile =
                files[0];


            document.getElementById(
                "splitPDFFiles"
            ).innerHTML = `

                <div class="settings" style="margin-top:20px">

                    <div class="field">

                        <label>
                            Pages
                        </label>

                        <input
                            id="splitPages"
                            placeholder="Example: 1,3,5"
                        >

                    </div>

                    <button
                        class="action-btn"
                        onclick="splitPDF()"
                    >
                        Extract Pages
                    </button>

                </div>
            `;

        }
    );
}


async function splitPDF() {

    const pageText =
        document.getElementById(
            "splitPages"
        ).value;


    const pages =
        pageText
            .split(",")
            .map(
                p =>
                    Number(p.trim()) - 1
            )
            .filter(
                p =>
                    Number.isInteger(p) &&
                    p >= 0
            );


    const bytes =
        await window.splitPDFFile.arrayBuffer();


    const source =
        await PDFLib.PDFDocument.load(bytes);


    const output =
        await PDFLib.PDFDocument.create();


    const copied =
        await output.copyPages(
            source,
            pages
        );


    copied.forEach(
        page =>
            output.addPage(page)
    );


    const result =
        await output.save();


    downloadBlob(
        new Blob(
            [result],
            {type: "application/pdf"}
        ),
        "fileforge-split.pdf"
    );
}


/* =========================================================
   PDF COMPRESSION
========================================================= */

function renderPDFCompress() {

    toolContent.innerHTML = uploadArea({
        id: "pdfCompressUpload",
        accept: "application/pdf",
        text: "Drop your PDF here",
        subtext: "PDF files"
    });


    setupDropzone(
        "pdfCompressUpload",
        files => {

            if (!files.length) return;

            window.pdfCompressFile =
                files[0];


            document.getElementById(
                "pdfCompressFiles"
            ).innerHTML = `

                <div class="quality-notice"
                     style="margin-top:20px">

                    Browser-only PDF compression has
                    technical limitations.

                    This tool will optimize the PDF
                    structure where possible, but image-heavy
                    PDFs may require server-side compression
                    for major size reduction.

                </div>

                <button
                    class="action-btn"
                    onclick="compressPDF()"
                >
                    Optimize PDF
                </button>
            `;

        }
    );
}


async function compressPDF() {

    const bytes =
        await window.pdfCompressFile.arrayBuffer();


    const pdf =
        await PDFLib.PDFDocument.load(bytes);


    const result =
        await pdf.save({
            useObjectStreams: true,
            addDefaultPage: false
        });


    downloadBlob(
        new Blob(
            [result],
            {type: "application/pdf"}
        ),
        "fileforge-compressed.pdf"
    );
}


/* =========================================================
   PDF → IMAGE
========================================================= */

function renderPDFToImage(type) {

    toolContent.innerHTML = uploadArea({
        id: "pdfImageUpload",
        accept: "application/pdf",
        text: "Drop your PDF here",
        subtext: "Convert PDF pages into images"
    });


    setupDropzone(
        "pdfImageUpload",
        files => {

            if (!files.length) return;

            window.pdfImageFile =
                files[0];

            window.pdfImageType =
                type;


            document.getElementById(
                "pdfImageFiles"
            ).innerHTML = `

                <button
                    class="action-btn"
                    onclick="convertPDFToImages()"
                >
                    Convert PDF to ${type.toUpperCase()}
                </button>
            `;
        }
    );
}


async function convertPDFToImages() {

    const pdfjs =
        await import(
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs"
        );


    pdfjs.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";


    const bytes =
        await window.pdfImageFile.arrayBuffer();


    const pdf =
        await pdfjs.getDocument({
            data: bytes
        }).promise;


    const zip =
        new JSZip();


    for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
    ) {

        const page =
            await pdf.getPage(pageNumber);


        /*
            Higher scale = higher resolution.

            2.5 is a good high-quality default.
        */

        const viewport =
            page.getViewport({
                scale: 2.5
            });


        const canvas =
            document.createElement("canvas");


        canvas.width =
            Math.ceil(viewport.width);

        canvas.height =
            Math.ceil(viewport.height);


        const ctx =
            canvas.getContext("2d");


        ctx.imageSmoothingEnabled = true;

        ctx.imageSmoothingQuality =
            "high";


        await page.render({
            canvasContext: ctx,
            viewport
        }).promise;


        const mime =
            window.pdfImageType === "png"
                ? "image/png"
                : "image/jpeg";


        const blob =
            await canvasToBlob(
                canvas,
                mime,
                1
            );


        zip.file(
            `page-${pageNumber}.${window.pdfImageType}`,
            blob
        );
    }


    const zipBlob =
        await zip.generateAsync({
            type: "blob"
        });


    downloadBlob(
        zipBlob,
        `fileforge-pdf-${window.pdfImageType}.zip`
    );
}


/* =========================================================
   INITIAL
========================================================= */

window.addEventListener(
    "DOMContentLoaded",
    async () => {

        /* PDF editing is intentionally not part of FileForge. */
        currentTool = null;
        await requireAuthentication();

    }
);