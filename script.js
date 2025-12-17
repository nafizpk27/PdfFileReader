
        lucide.createIcons();
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        let pdfDoc = null, sheetIdx = 0, sheets = [], zoomLevel = 1, currentFile = null;

        const pdfInput = document.getElementById('pdf-input');
        const dropZone = document.getElementById('drop-zone');
        const book = document.getElementById('book-canvas');
        const loader = document.getElementById('loader');

        // Logic for File Selection
        const loadFile = async (file) => {
            if (!file || file.type !== 'application/pdf') return;
            currentFile = file;
            loader.classList.remove('hidden');
            const buffer = await file.arrayBuffer();
            pdfDoc = await pdfjsLib.getDocument(buffer).promise;
            document.getElementById('total-p').textContent = pdfDoc.numPages;
            await buildBook();
            document.getElementById('upload-screen').classList.add('hidden');
            document.getElementById('reader-container').classList.remove('hidden');
            loader.classList.add('hidden');
        };

        pdfInput.onchange = (e) => loadFile(e.target.files[0]);
        dropZone.onclick = () => pdfInput.click();
        
        // Drag and Drop
        dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.background = "#f0f4ff"; };
        dropZone.ondragleave = () => { dropZone.style.background = "transparent"; };
        dropZone.ondrop = (e) => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); };

        async function buildBook() {
            book.innerHTML = ''; sheets = [];
            for (let i = 1; i <= pdfDoc.numPages; i += 2) {
                const sheet = document.createElement('div');
                sheet.className = 'sheet';
                sheet.style.zIndex = Math.ceil(pdfDoc.numPages / 2) - sheets.length;
                const front = document.createElement('div'); front.className = 'side front';
                await renderPage(i, front); sheet.appendChild(front);
                const back = document.createElement('div'); back.className = 'side back';
                if (i + 1 <= pdfDoc.numPages) await renderPage(i + 1, back);
                sheet.appendChild(back);
                book.appendChild(sheet); sheets.push(sheet);
            }
        }

        async function renderPage(num, container) {
            const page = await pdfDoc.getPage(num);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            canvas.height = viewport.height; canvas.width = viewport.width;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
            container.appendChild(canvas);
        }

        // Search Implementation: Jump to page number
        function goToSearchPage() {
            const input = document.getElementById('search-input').value;
            const pageNum = parseInt(input);
            if (isNaN(pageNum) || pageNum < 1 || pageNum > pdfDoc.numPages) {
                alert("Please enter a valid page number.");
                return;
            }
            // Reset book
            sheets.forEach(s => { s.classList.remove('flipped'); s.style.zIndex = ''; });
            sheetIdx = 0;
            // Flip to target
            const targetSheet = Math.floor((pageNum - 1) / 2);
            for(let i = 0; i < targetSheet; i++) {
                next();
            }
            updateUI();
        }

        // Navigation
        const next = () => {
            if (sheetIdx < sheets.length) {
                sheets[sheetIdx].classList.add('flipped');
                sheets[sheetIdx].style.zIndex = sheetIdx + 1;
                sheetIdx++; updateUI();
            }
        };
        const prev = () => {
            if (sheetIdx > 0) {
                sheetIdx--; sheets[sheetIdx].classList.remove('flipped');
                sheets[sheetIdx].style.zIndex = sheets.length - sheetIdx;
                updateUI();
            }
        };

        document.getElementById('next-btn').onclick = next;
        document.getElementById('prev-btn').onclick = prev;

        function updateUI() {
            const p = (sheetIdx * 2) + 1;
            document.getElementById('cur-p').textContent = p > pdfDoc.numPages ? pdfDoc.numPages : p;
        }

        function adjustZoom(delta) {
            zoomLevel = Math.max(0.5, Math.min(1.5, zoomLevel + delta));
            book.style.transform = `scale(${zoomLevel})`;
        }

        // Toolbar Buttons
        document.getElementById('print-btn').onclick = () => {
            const url = URL.createObjectURL(currentFile);
            const win = window.open(url, '_blank');
            win.onload = () => win.print();
        };

        document.getElementById('share-btn').onclick = async () => {
            if (navigator.share) {
                try {
                    await navigator.share({ title: currentFile.name, text: 'Reading this PDF', url: window.location.href });
                } catch (err) { console.log("Share failed"); }
            } else { alert("Share not supported. Copy URL: " + window.location.href); }
        };

        document.getElementById('dl-btn').onclick = () => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(currentFile);
            a.download = currentFile.name;
            a.click();
        };

        document.getElementById('fs-btn').onclick = () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
        };

        window.onkeydown = (e) => {
            if (e.key === 'ArrowRight') next();
            if (e.key === 'ArrowLeft') prev();
        };
