export const printFieldMap = (selectedView: string, selectedViewLabel: string): void => {
    alert("You may need to change print settings - such as page size, margins, and scaling - to get the fieldmap to display properly in the print preview. Select \"Background graphics\" to ensure the legend includes colors.");
    const title = selectedView === 'fieldmap' ? 'Field Map View' : selectedViewLabel;
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
        printWindow.document.write('<html><head><title>Print Field Map</title>');
        
        // Copy styles from the main window to ensure Tailwind classes work in the print window
        document.querySelectorAll('style, link[rel="stylesheet"]').forEach(style => {
            printWindow.document.write(style.outerHTML);
        });

        // Extract the dynamic gradient style to override print resets
        const gradientDiv = document.querySelector('#legend_list div[style*="linear-gradient"]');
        const gradientStyle = gradientDiv ? (gradientDiv as HTMLElement).style.background : '';

        printWindow.document.write(`
            <style>
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                body {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-direction: column;
                    margin: 0;
                    padding: 20px;
                }
                svg {
                    max-width: 100%;
                    height: auto !important;
                    display: block;
                    margin: 0 auto;
                }
                #legend_list {
                    width: 100%;
                    margin-bottom: 20px;
                }
                @media print {
                    body { padding: 0; }
                    
                    /* Override aggressive print resets (like Bootstrap's) by using higher specificity than '*' */
                    #legend_list span, 
                    #legend_list div {
                        print-color-adjust: exact !important;
                        -webkit-print-color-adjust: exact !important;
                    }

                    /* Re-assert the dynamic heatmap gradient */
                    #legend_list div[style*="linear-gradient"] {
                        background: ${gradientStyle} !important;
                    }

                    /* Explicitly re-assert standard legend colors to fight off 'background: transparent !important' */
                    #legend_list .tw\\:bg-\\[\\#d3d3d3\\] { background-color: #d3d3d3 !important; }
                    #legend_list .tw\\:bg-\\[\\#c7e9b4\\] { background-color: #c7e9b4 !important; }
                    #legend_list .tw\\:bg-\\[\\#41b6c4\\] { background-color: #41b6c4 !important; }
                    #legend_list .tw\\:bg-\\[\\#6a5acd\\] { background-color: #6a5acd !important; }
                    #legend_list .tw\\:bg-\\[\\#008000\\] { background-color: #008000 !important; }
                    #legend_list .tw\\:bg-\\[\\#ff0000\\] { background-color: #ff0000 !important; }
                    #legend_list .tw\\:bg-\\[\\#000000\\] { background-color: #000000 !important; }
                    #legend_list .tw\\:bg-\\[\\#a9afaf\\] { background-color: #a9afaf !important; }
                    #legend_list .tw\\:bg-\\[\\#ffffff\\] { background-color: #ffffff !important; }
                }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            ${document.getElementById('legend_list')?.outerHTML || ''}
            ${document.getElementById('fieldmap_chart_svg')?.outerHTML || ''}
        </body></html>
        `);
        printWindow.document.close();
        
        setTimeout(() => {
            if (printWindow) printWindow.print();
        }, 500);
    }
};
