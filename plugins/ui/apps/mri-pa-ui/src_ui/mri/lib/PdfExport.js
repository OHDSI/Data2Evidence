sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "sap/hc/mri/pa/ui/lib/MriFrontendConfig",
    "sap/hc/mri/pa/ui/lib/ifr/IFR2Bookmark",
    "sap/hc/mri/pa/ui/lib/thirdparty/filesaver",
    "sap/hc/mri/pa/ui/lib/thirdparty/jspdf"
], function (jQuery, Utils, MriFrontendConfig, ifr2bookmark) {
    var PdfExport = function () {
        //Do Something here
    };

    PdfExport.prototype.generatePDF = function (paController, pdfParam) {

        var chartType = paController.getCurrentChartType();
        var chartWrapper = paController.oChartCache[chartType];
        var chartObj = chartWrapper.getAggregation("chart");

        var ifr = paController._patientFilter.getIFR();
        var bookmark = ifr2bookmark(ifr);
        var patientCount = paController.getView().getModel("results").getData().total.size;
        var timestamp = Date.now().toString();

        var axisInformation = paController.getView().getModel(Utils.models.SELECTIONS).getData();
        var axisLocationInformation = paController.getView().getModel(Utils.models.LOCATIONS).getData();
        var axisLayout = paController.getView().byId("layAttributesContainer");

        var selectedChartButton = paController.chartButtonsMap[chartType];
        var chartIconUri = selectedChartButton.getProperty("icon");
        var chartName = selectedChartButton.getAggregation("tooltip");
        var titleText = chartName;
        var titleIcon = sap.ui.core.IconPool.getIconInfo(chartIconUri).content;
        var titleIconSource = sap.ui.core.IconPool.getIconInfo(chartIconUri).fontFamily;

        var configInfo = paController._config;
        var originalHeight = "100%";
        var originalWidth = "100%";

        var PdfConstructor = window.jsPDF;
        var pdf = new PdfConstructor(pdfParam.orientation, "mm", pdfParam.paperSize);

        var mm = 3.75; //pixel per mm

        var pdfConst = {
            pageWidth: 297,
            pageHeight: 210,
            pageLeftMargin: 8.5,
            pageRightMargin: 8.5,
            pageTopMargin: 20,
            pageBottomMargin: 10,

            pageTitleFont: 12,
            pageTitleMargin: 0.5,

            iconFont: 14,
            iconWidth: 4.6,
            iconHeight: 4.6,
            iconHMargin: 1,
            iconVMargin: 1,

            footerFont: 8,
            footerColor: { R: 0, G: 0, B: 0, HEX: "#000000" },
            footerBottomMargin: 6.5,
            foorterRightMargin: 5,

            chartFont: 8,
            chartFontHeight: 2.3,

            sectionHeaderFont: 10,
            sectionHeaderFontHeight: 3.5,
            sectionHeaderIconMargin: 1.5,
            sectionHeaderTopLineMargin: 2.5,
            sectionHeaderBottomLineMargin: 3,
            sectionFooterBottomMargin: 5.5,

            detailsFont: 8,
            filterCardsFont: 8,

            tableMargin: 2,
            tableFont: 8,
            tableFontHeight: 2.3,
            tableColor: { R: 0, G: 143, B: 227, HEX: "#008fd3" },
            tableBorderColor: { R: 170, G: 170, B: 170, HEX: "#aaaaaa" },
            largeBoxMargin: 2.5,
            largeBoxMarginInternal: 3,
            largeBoxHeaderMargin: 3.4,
            smallBoxMargin: 2,

            filterCardBorderColor: { R: 100, G: 100, B: 100, HEX: "#646464" },
            filterCardTitleMargin: 1.2,
            filterCardPerRow: 4,
            filterCardBottomMargin: 8,
            filterCardFontHeight: 2.3,
            filterCardNextLineHeight: 1,
            filterCardHeaderBottomMargin: 3.4,
            filterCardColor: { R: 0, G: 143, B: 227, HEX: "#008fd3" },
            filterCardHeaderFontColor: { R: 255, G: 255, B: 255, HEX: "#ffffff" },
            filterCardFirstAttribute: 4.5,
            filterCardFirstAttributeLarge: 5.4,
            filterCardBetweenAttribute: 4,
            filterCardBetweenAttributeLarge: 4.5,
            filterCardBetweenAttributeConstraint: 2.7,
            filterCardBetweenAttributeConstraintLarge: 4,

            constraintMinLength: 8,
            constraintNextLine: 2.5,

            axisInfoFont: 8,
            axisInfoFontHeight: 2.3,
            axisInfoHeaderBottomMargin: 3.4,
            axisIconHmargin: 1.5,
            axisInfoMarginBetween: 3,
            axisInfoMarginBetweenCat: 8,

            kmLegendWidth: 30,
            kmLegendFont: "12px Arial",
            kmLegendColor: "#000000",
            kmLegendMargin: 10,
            kmLegendTextMargin: 2,
            kmLegendBox: 12,

            boxplotHeaderBorderColor: { R: 0, G: 0, B: 0, HEX: "#000000" },

            plHeaderColor: { R: 245, G: 245, B: 245, HEX: "#f5f5f5" },
            plFont: 8
        };

        //Color Transformation for different opacity in KM Chart
        var colorConstOpacity = [
            { originR: 235, originG: 115, originB: 0, newR: 246, newG: 199, newB: 165 },
            { originR: 147, originG: 201, originB: 57, newR: 212, newG: 233, newB: 176 },
            { originR: 240, originG: 171, originB: 0, newR: 250, newG: 222, newB: 153 },
            { originR: 150, originG: 9, originB: 129, newR: 214, newG: 153, newB: 205 },
            { originR: 235, originG: 115, originB: 150, newR: 248, newG: 198, newB: 213 },
            { originR: 227, originG: 85, originB: 0, newR: 245, newG: 187, newB: 153 },
            { originR: 79, originG: 184, originB: 28, newR: 183, newG: 227, newB: 153 },
            { originR: 210, originG: 150, originB: 0, newR: 237, newG: 213, newB: 153 },
            { originR: 118, originG: 10, originB: 133, newR: 201, newG: 153, newB: 207 },
            { originR: 200, originG: 115, originB: 150, newR: 234, newG: 199, newB: 213 },
            { originR: 188, originG: 54, originB: 24, newR: 229, newG: 174, newB: 156 },
            { originR: 36, originG: 114, originB: 48, newR: 165, newG: 199, newB: 171 },
            { originR: 190, originG: 130, originB: 0, newR: 229, newG: 205, newB: 153 },
            { originR: 69, originG: 21, originB: 126, newR: 181, newG: 158, newB: 204 },
            { originR: 160, originG: 115, originB: 150, newR: 217, newG: 199, newB: 213 }
        ];

        if (pdfParam.paperSize === "a3") {
            pdfConst.pageWidth = 420;
            pdfConst.pageHeight = 297;
        }

        if (pdfParam.paperSize === "letter") {
            pdfConst.pageWidth = 279.4;
            pdfConst.pageHeight = 215.9;
        }

        if (pdfParam.paperSize === "legal") {
            pdfConst.pageWidth = 355.6;
            pdfConst.pageHeight = 215.9;
        }

        if (pdfParam.orientation === "p") {
            var temp = pdfConst.pageWidth;
            pdfConst.pageWidth = pdfConst.pageHeight;
            pdfConst.pageHeight = temp;
        }

        var targetHeight = (pdfConst.pageHeight - pdfConst.pageTopMargin - pdfConst.pageBottomMargin) * mm;
        var targetWidth = (pdfConst.pageWidth - pdfConst.pageLeftMargin - pdfConst.pageRightMargin) * mm;

        var canvasWrapper = function (ctx, text, maxWidth) {
            var words = text.split(" ");
            var lines = [];
            var currentLine = words[0];

            for (var i = 1; i < words.length; i++) {
                var word = words[i];
                var width = ctx.measureText(currentLine + " " + word).width;
                if (width < maxWidth) {
                    currentLine += " " + word;
                } else {
                    lines.push(currentLine);
                    currentLine = word;
                }
            }
            lines.push(currentLine);
            return lines;
        };

        /**
         * Load/Unload Busy Indicator in the main Screen and resizing the chart. This is done so paController the
         * chart size in the pdf is consistent. Resizing the chart is needed because categories label might not
         * be visible if the chart is too small
         * @param   {Chart Object} [chart] Chart Object to be resized. For Stacked Bar and Boxplot, this is the medexChart Object
         * For KM, due to the the custom d3 chart, we need to go to the KaplanMeierChartControl itself
         *
         * @param   {Object} [height] String for MedexChart (e.g. "100%", "1000px"), Number for KaplanMeierChartControl
         * @param   {Object} [width] String for MedexChart (e.g. "100%", "1000px"), Number for KaplanMeierChartControl
         * @param   {Boolean} [hide] Load/Unload Busy Indicator
         * @returns N/A
         */
        var chartResize = function (chart, height, width, hide) {

            if (hide) {
                paController.getView().byId("layMain").setBusyIndicatorDelay(0).addStyleClass("opaqueBusyIndicator");
                paController.getView().byId("layMain").setBusy(true);
                paController.getView().setBusyIndicatorDelay(0);
                paController.getView().setBusy(true);

                if (chartType === "stacked") {
                    var noAnimation = new sap.viz.ui5.types.StackedVerticalBar_animation({
                        dataLoading: false,
                        dataUpdating: false
                    });
                    chartObj.getPlotArea().setAggregation("animation", noAnimation);
                }
            }

            if (chartType === "km") {
                chartObj.setYpoints(Math.floor(height));
                chartObj.setXpoints(Math.floor(width));
            } else {
                chart.setHeight(height);
                chart.setWidth(width);
            }

            if (!hide) {
                if (chartType === "stacked") {
                    chartObj.getPlotArea().setAggregation("animation", null);
                }

                setTimeout(function () {
                    paController.getView().byId("layMain").setBusy(false);
                    paController.getView().setBusy(false);
                }, 800);
            }
        };

        /**
         * Create an Icon to be attached to the PDF. It will use a canvas to write the Icon on a background color, and create a jpeg.
         *
         * @param   {String} [iconText] String for MedexChart (e.g. "100%", "1000px"), Number for KaplanMeierChartControl
         * @param   {String} [iconType] String for MedexChart (e.g. "100%", "1000px"), Number for KaplanMeierChartControl
         * @param   {Number} [iconFont] FontSize when writing the Icon in the Canvas
         * @param   {Number} [iconWidth] Resulting Icon Width in mm
         * @param   {Number} [iconHeight] Resulting Icon Height in mm
         * @param   {String} [color] Background Color in Hex
         * @returns {ImageDataUrl} Image Data URL Object
         */
        var getJpegIcon = function (iconText, iconType, iconFont, iconWidth, iconHeight, color) {
            var iconFamily = iconType || "SAP-icons";
            var textCanvas = document.createElement("canvas");
            var backgroundColor = color || "#ffffff";
            textCanvas.height = pdfConst.iconHeight * mm;
            textCanvas.width = pdfConst.iconWidth * mm;
            var ct = textCanvas.getContext("2d");
            ct.fillStyle = backgroundColor;
            ct.fillRect(0, 0, pdfConst.iconWidth * mm, pdfConst.iconHeight * mm);
            ct.fillStyle = "#000000";
            ct.font = pdfConst.iconFont + "px " + iconFamily;
            ct.fillText(iconText, 1, (pdfConst.iconHeight - 1) * mm);

            return textCanvas.toDataURL("image/jpeg");
        };

        /**
         * Print the PDF to be downloaded by the user. Generates Footer with paging.
         *
         * @param   {Array} [pdfCommands] An array of PDF Commands to be executed. Each element of the array contain an object with a property "commands", which contain
         * an array of PDF Command. Each of these elements represent one page.
         * The PDF Commands itself is just a container of jsPDF API commands (e.g write text, swtich font, draw rectangle)
         * This structure is created due to the limitation of jsPDF of unable to go to previous pages once a new page is created
         *
         * @returns N/A
         */
        var printPdfToFile = function (pdfCommands) {

            var currentPage = 1;
            var totalPage = pdfCommands.length;
            var addFooter = function () {
                var footerText = Utils.getText("MRI_PA_DOWNLOAD_PDF_FOOTER_PAGE", [currentPage, totalPage]);
                pdf.setFontSize(pdfConst.footerFont);
                pdf.setTextColor(pdfConst.footerColor.R, pdfConst.footerColor.G, pdfConst.footerColor.B);
                var textWidth = pdf.getStringUnitWidth(footerText) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;

                pdf.text(pdfConst.pageWidth - pdfConst.pageRightMargin - pdfConst.foorterRightMargin - textWidth, pdfConst.pageHeight - pdfConst.footerBottomMargin, footerText);
                currentPage++;
            };

            for (var i = 0; i < pdfCommands.length; i++) {
                if (i > 0) {
                    pdf.addPage();
                }

                var pdfCommandsObj = pdfCommands[i].commands;
                for (var ii = 0; ii < pdfCommandsObj.length; ii++) {
                    var command = pdfCommandsObj[ii];
                    //PDF Commands
                    if (command.op === "rect") {
                        pdf.rect(command.params[0], command.params[1], command.params[2], command.params[3]);
                    } else if (command.op === "rectFill") {
                        pdf.rect(command.params[0], command.params[1], command.params[2], command.params[3], "F");
                    } else if (command.op === "addImage") {
                        pdf.addImage(command.params[0], command.params[1], command.params[2], command.params[3]);
                    } else if (command.op === "line") {
                        pdf.line(command.params[0], command.params[1], command.params[2], command.params[3]);
                    } else if (command.op === "text") {
                        pdf.text(command.params[0], command.params[1], command.params[2]);
                    } else if (command.op === "setFontSize") {
                        pdf.setFontSize(command.params[0]);
                    } else if (command.op === "setTextColor") {
                        pdf.setTextColor(command.params[0], command.params[1], command.params[2]);
                    } else if (command.op === "setFillColor") {
                        pdf.setFillColor(command.params[0], command.params[1], command.params[2]);
                    } else if (command.op === "setDrawColor") {
                        pdf.setDrawColor(command.params[0], command.params[1], command.params[2]);
                    } else if (command.op === "setFontType") {
                        pdf.setFontType(command.params[0]);
                    }
                }


                addFooter();
            }

            var filename = pdfParam.fileName;
            if (!filename) {
                filename = (document.title).replace(" ", "") + "_" + chartName.replace(" ", "-") + "_" + timestamp + ".pdf";
            } else if (!filename.indexOf(".pdf") > -1) {
                filename += ".pdf";
            }
            pdf.save(filename);
        };

        /**
         * This Method generates commands to print the titleText (a global variable within the generatePDF method)
         *
         * @param   {Array} [pdfCommandArray] Array of PDF Commands to where the new commands will be appended to
         * @returns {Array} The same PDF Commands passed after additional commands to print the chart title is appended to it
         */
        var printChartTitle = function (pdfCommandArray) {
            pdf.setFontSize(pdfConst.pageTitleFont);
            pdf.setTextColor(0, 0, 0);
            pdfCommandArray.push({
                op: "setFontSize",
                params: [pdfConst.pageTitleFont]
            });
            pdfCommandArray.push({
                op: "setTextColor",
                params: [0, 0, 0]
            });
            var titleLength = pdf.getStringUnitWidth(titleText) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
            var titleIconHeight = pdfConst.iconVMargin * 2 + pdfConst.iconHeight;
            titleLength += pdfConst.iconHMargin * 2 + pdfConst.iconWidth;
            var titleXpos = (pdfConst.pageWidth - titleLength) / 2;
            var titleYPos = (pdfConst.pageTopMargin) / 2;
            var titleYPosIcon = (pdfConst.pageTopMargin - titleIconHeight) / 2;

            pdfCommandArray.push({
                op: "text",
                params: [titleXpos + pdfConst.iconHMargin + pdfConst.iconWidth, titleYPos + pdfConst.pageTitleMargin, titleText]
            });
            pdfCommandArray.push({
                op: "addImage",
                params: [getJpegIcon(titleIcon, titleIconSource, pdfConst.iconFont, pdfConst.iconWidth, pdfConst.iconHeight), "jpeg", titleXpos - pdfConst.iconHMargin, titleYPosIcon]
            });
            return pdfCommandArray;
        };

        /**
         * This Method generates the Commands paController contain Details / Patient List Chart Data in a Table
         *
         * @param   {Number} [yStart] The starting Y Position of the Current Page
         * @param   {Array} [prevPageCommands] Array of PDF Commands up to the point of Y Position
         * @param   {Number} [columnNo] The Number of Columns within this table
         * @param   {Array of Array} [data] A 2 Dimensional Array containing the data to be printed unto the table.
         * @returns {Array} Array containing the commands to print the pdf data table, combined with the prevPageCommands parameter
         */
        var generatePdfDataTable = function (yStart, prevPageCommands, columnNo, data) {
            var collatedPageCommands = [];
            var counter = 0;
            var rowHeight;
            var cellWidthWMargin = (pdfConst.pageWidth - pdfConst.pageLeftMargin - pdfConst.pageRightMargin) / columnNo;
            var cellWidth = cellWidthWMargin - 2 * (pdfConst.tableMargin);

            pdf.setFontSize(pdfConst.tableFont);

            prevPageCommands.push({
                op: "setFontSize",
                params: [pdfConst.tableFont]
            });

            prevPageCommands.push({
                op: "setDrawColor",
                params: [pdfConst.tableBorderColor.R, pdfConst.tableBorderColor.G, pdfConst.tableBorderColor.B]
            });

            while (counter < data.length) {
                rowHeight = pdfConst.tableFontHeight + pdfConst.tableMargin * 2;
                var rowCommand = [];

                for (var i = 0; i < columnNo; i++) {
                    var cellText = data[counter][i];
                    if (cellText) {
                        var splitText = pdf.splitTextToSize(cellText, cellWidth);
                        var cellHeight = pdfConst.tableMargin * 2 + ((pdfConst.tableFontHeight + 1) * splitText.length) - 1;

                        rowCommand.push({
                            op: "text",
                            params: [pdfConst.pageLeftMargin + (i * cellWidthWMargin) + pdfConst.tableMargin, yStart + pdfConst.tableFontHeight + pdfConst.tableMargin, splitText]
                        });

                        if (cellHeight > rowHeight) {
                            rowHeight = cellHeight;
                        }
                    }

                }

                if (yStart + rowHeight > pdfConst.pageHeight - pdfConst.pageBottomMargin) {
                    collatedPageCommands.push({ commands: prevPageCommands });
                    prevPageCommands = [];
                    prevPageCommands = printChartTitle(prevPageCommands);

                    prevPageCommands.push({
                        op: "setFontSize",
                        params: [pdfConst.tableFont]
                    });

                    prevPageCommands.push({
                        op: "setDrawColor",
                        params: [pdfConst.tableBorderColor.R, pdfConst.tableBorderColor.G, pdfConst.tableBorderColor.B]
                    });

                    for (i = 0; i < rowCommand.length; i++) {
                        if (rowCommand[i].op === "text") {
                            rowCommand[i].params[1] -= (yStart - pdfConst.pageTopMargin);
                        }
                    }
                    yStart = pdfConst.pageTopMargin;
                }

                rowCommand.push({
                    op: "rect",
                    params: [pdfConst.pageLeftMargin, yStart, (pdfConst.pageWidth - pdfConst.pageLeftMargin - pdfConst.pageRightMargin), rowHeight]
                });

                for (i = 0; i < rowCommand.length; i++) {
                    prevPageCommands.push(rowCommand[i]);
                }

                yStart += rowHeight;
                counter++;
            }
            collatedPageCommands.push({ commands: prevPageCommands });

            return collatedPageCommands;
        };

        var parseConstraint = function (constraint) {
            var constraintText = "";
            if (constraint.op === "AND") {
                var numConstraint = (constraint.content[0] && !isNaN(constraint.content[0].value));
                if (numConstraint) {
                    if (constraint.content[0].operator === ">=") {
                        constraintText = "[";
                    } else {
                        constraintText = "]";
                    }
                    constraintText += constraint.content[0].value.toString();
                    constraintText += " - ";

                    constraintText += constraint.content[1].value.toString();
                    if (constraint.content[1].operator === "<=") {
                        constraintText += "]";
                    } else {
                        constraintText += "[";
                    }
                } else {
                    for (var i = 0; i < constraint.content.length; i++) {
                        if (i > 0) {
                            constraintText += ", ";
                        }
                        constraintText += constraint.content[i].operator + " ";
                        var dt1 = new Date(Date.parse(constraint.content[i].value));
                        constraintText += dt1.toString();
                    }
                }
            } else {
                constraintText = constraint.value.toString();
                if (constraint.op && constraint.op !== "=") {
                    constraintText = constraint.op + constraintText;
                } else if (constraint.operator && constraint.operator !== "=") {
                    constraintText = constraint.operator + constraintText;
                }
            }
            return constraintText;
        };

        /**
         * This Method generates PDF Commands for the FilterCard and Details of the Charts.
         *
         * @param   N/A
         * @returns {Array} Array of "Pages" containing the PDF Commands to draw the Filtercard and Details
         */
        var generatePdfFilterDetails = function () {

            //Calculates the Height of Texts when there is more than one line
            var getFilterTextHeight = function (rows) {
                return rows * (pdfConst.filterCardFontHeight + pdfConst.filterCardNextLineHeight) - pdfConst.filterCardNextLineHeight;
            };

            titleText = document.title + ": " + Utils.getText("MRI_PA_DOWNLOAD_PDF_SUMMARY");

            var pdfCommands = [];
            var pageCommands = [];
            pageCommands = printChartTitle(pageCommands);
            var rowCommands = [];
            var yStart = pdfConst.pageTopMargin;
            var xStart = pdfConst.pageLeftMargin;

            //Draw FilterCards
            if (pdfParam.includeFiltercard) {
                //Part 1: Filtercards and Patient Count Header
                var colArray = [];
                var yOffset = yStart;
                xStart = pdfConst.pageLeftMargin;
                rowCommands.push({
                    op: "setFontSize",
                    params: [pdfConst.sectionHeaderFont]
                });
                pdf.setFontSize(pdfConst.sectionHeaderFont);

                var filterIcon = sap.ui.core.IconPool.getIconInfo("sap-icon://filter");
                var patientCountIcon = sap.ui.core.IconPool.getIconInfo("sap-icon://wounds-doc");
                rowCommands.push({
                    op: "addImage",
                    params: [getJpegIcon(filterIcon.content, filterIcon.fontFamily, pdfConst.iconFont, pdfConst.iconWidth, pdfConst.iconHeight), "jpeg", xStart + pdfConst.sectionHeaderIconMargin, yStart]
                });
                rowCommands.push({
                    op: "text",
                    params: [xStart + pdfConst.iconWidth + (pdfConst.sectionHeaderIconMargin * 2), yStart + pdfConst.iconHeight - 1, Utils.getText("MRI_PA_DOWNLOAD_PDF_TEXT_FILTER_CARDS")]
                });
                var patientCountText = Utils.getText("MRI_PA_DOWNLOAD_PDF_TEXT_PATIENT_COUNT") + ":" + patientCount;
                var patientCountTextLength = pdf.getStringUnitWidth(patientCountText) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
                rowCommands.push({
                    op: "text",
                    params: [pdfConst.pageWidth - pdfConst.pageRightMargin - patientCountTextLength - pdfConst.iconHMargin, yStart + pdfConst.iconHeight - 1, patientCountText]
                });
                rowCommands.push({
                    op: "addImage",
                    params: [getJpegIcon(patientCountIcon.content, patientCountIcon.fontFamily, pdfConst.iconFont, pdfConst.iconWidth, pdfConst.iconHeight), "jpeg", pdfConst.pageWidth - pdfConst.pageRightMargin - patientCountTextLength - pdfConst.iconWidth - (pdfConst.iconHMargin * 2), yStart]
                });

                yStart += pdfConst.iconHeight + pdfConst.sectionHeaderTopLineMargin;
                rowCommands.push({
                    op: "line",
                    params: [pdfConst.pageLeftMargin, yStart, pdfConst.pageWidth - pdfConst.pageRightMargin, yStart]
                });

                yStart += pdfConst.sectionHeaderBottomLineMargin;
                rowCommands.push({
                    op: "setFontSize",
                    params: [pdfConst.filterCardsFont]
                });
                pdf.setFontSize(pdfConst.filterCardsFont);

                for (var i = 0; i < rowCommands.length; i++) {
                    pageCommands.push(rowCommands[i]);
                }
                rowCommands = [];

                //Part 2: The Filtercards

                var nextPageCommands = [];
                nextPageCommands = printChartTitle(nextPageCommands);
                var pageOverflow = false;
                var currentProcessed = 0;
                var filterCardWidth = (pdfConst.pageWidth - pdfConst.pageLeftMargin - pdfConst.pageRightMargin) / pdfConst.filterCardPerRow;
                var filterCardWidthContent = filterCardWidth - (pdfConst.largeBoxMargin * 2) - (pdfConst.largeBoxMarginInternal * 2) - (pdfConst.axisIconHmargin * 2) - pdfConst.iconWidth;
                var yLimit = pdfConst.pageHeight - pdfConst.pageBottomMargin - pdfConst.filterCardBottomMargin;

                var fcArray = bookmark.cards.content[0].content;
                var andFilterCard = fcArray;
                var fcIcon = sap.ui.core.IconPool.getIconInfo("sap-icon://MRI/bool-and");

                if (fcArray.length > 0) {
                    var andFilterCardTitle = Utils.getText("MRI_PA_MATCH_ALL").replace("<strong>", "").replace("</strong>", "");
                    pageCommands.push({
                        op: "text",
                        params: [pdfConst.pageLeftMargin, yStart + pdfConst.filterCardFontHeight, andFilterCardTitle]
                    });
                    yStart += 2 * pdfConst.filterCardFontHeight;
                }
                var maxY = yStart + 1;

                for (i = 0; i < fcArray.length; i++) {
                    var filterCardObj = fcArray[i];
                    var exclude = (filterCardObj.op === "NOT");
                    if (exclude) {
                        filterCardObj = filterCardObj.content[0];
                    }
                    //Offsets:
                    var yIfOff = 0;
                    var targetArray = pageCommands;
                    var filterCardOverflow = false;

                    xStart = currentProcessed * filterCardWidth + pdfConst.pageLeftMargin;
                    var currentX;
                    var currentY = yStart + pdfConst.largeBoxMargin;

                    //Filtercard Title
                    pdf.setFontSize(pdfConst.filterCardsFont);
                    pdf.setTextColor(0, 0, 0);
                    pdf.setFontType("bold");

                    var splitTitle = pdf.splitTextToSize(filterCardObj.name, filterCardWidthContent + pdfConst.axisIconHmargin);

                    if ((getFilterTextHeight(splitTitle.length) + currentY > yLimit) && !filterCardOverflow) {
                        var newY = pdfConst.pageTopMargin + pdfConst.largeBoxMargin + (pdfConst.pageHeight - pdfConst.pageBottomMargin);
                        yIfOff = (pdfConst.pageHeight - pdfConst.pageBottomMargin);
                        currentY = newY;
                        targetArray = nextPageCommands;
                        pageOverflow = true;
                        filterCardOverflow = true;
                    }

                    targetArray.push({
                        op: "setFontSize",
                        params: [pdfConst.filterCardsFont]
                    });
                    targetArray.push({
                        op: "setTextColor",
                        params: [0, 0, 0]
                    });
                    targetArray.push({
                        op: "setFontType",
                        params: ["bold"]
                    });

                    targetArray.push({
                        op: "addImage",
                        params: [getJpegIcon(fcIcon.content, fcIcon.fontFamily, pdfConst.iconFont, pdfConst.iconWidth, pdfConst.iconHeight), "jpeg", xStart + pdfConst.largeBoxMarginInternal, currentY - yIfOff]
                    });

                    xStart += pdfConst.iconWidth + pdfConst.axisIconHmargin + pdfConst.largeBoxMarginInternal;
                    targetArray.push({
                        op: "text",
                        params: [xStart, currentY + pdfConst.iconHeight - yIfOff - pdfConst.filterCardTitleMargin, splitTitle]
                    });
                    targetArray.push({
                        op: "setFontType",
                        params: ["normal"]
                    });
                    pdf.setFontType("normal");
                    currentY += getFilterTextHeight(splitTitle.length) + pdfConst.filterCardTitleMargin;

                    var attributes = filterCardObj.attributes.content;
                    var attributeObj;
                    var constraintArray;
                    var targetName;

                    if (exclude) {
                        constraintArray = [];
                        attributeObj = { constraints: { content: constraintArray }, configPath: "_excluded" };
                        attributes.unshift(attributeObj);
                    }

                    if (filterCardObj.parentInteraction) {

                        targetName = filterCardObj.parentInteraction;
                        constraintArray = [];
                        for (var iii = 0; iii < andFilterCard.length; iii++) {
                            if (andFilterCard[iii].instanceID === targetName) {
                                targetName = andFilterCard[iii].name;
                                break;
                            }
                        }
                        constraintArray.push({ value: targetName });
                        attributeObj = { constraints: { content: constraintArray }, configPath: "_parentInteraction" };
                        attributes.push(attributeObj);
                    }

                    if (filterCardObj.successor) {

                        targetName = filterCardObj.successor.id;
                        constraintArray = [];
                        for (iii = 0; iii < andFilterCard.length; iii++) {
                            if (andFilterCard[iii].instanceID === targetName) {
                                targetName = andFilterCard[iii].name;
                                break;
                            }
                        }

                        var dateRange = filterCardObj.successor.minDaysBetween;

                        if (filterCardObj.successor.maxDaysBetween) {
                            dateRange = dateRange + " - " + filterCardObj.successor.maxDaysBetween + " " + Utils.getText("MRI_PA_TEMPORAL_FILTER_DAYS") + " " + Utils.getText("MRI_PA_TEMPORAL_FILTER_BEFORE_START") + " " + Utils.getText("MRI_PA_TEMPORAL_FILTER_OF") + " ";
                        } else {
                            dateRange = ">" + dateRange + " " + Utils.getText("MRI_PA_TEMPORAL_FILTER_DAYS") + " " + Utils.getText("MRI_PA_TEMPORAL_FILTER_BEFORE_START") + " " + Utils.getText("MRI_PA_TEMPORAL_FILTER_OF") + " ";
                        }

                        targetName = dateRange + targetName;

                        constraintArray.push({ value: targetName });
                        attributeObj = { constraints: { content: constraintArray }, configPath: "_successor" };
                        attributes.push(attributeObj);
                    }

                    if (filterCardObj.advanceTimeFilter) {

                        constraintArray = [];

                        for (var ii = 0; ii < filterCardObj.advanceTimeFilter.filters.length; ii++) {
                            var atfObj = filterCardObj.advanceTimeFilter.filters[ii];
                            var atfText = "";
                            targetName = atfObj.value;

                            for (iii = 0; iii < andFilterCard.length; iii++) {
                                if (andFilterCard[iii].instanceID === targetName) {
                                    targetName = andFilterCard[iii].name;
                                    break;
                                }
                            }

                            if (atfObj.this === "overlap") {
                                atfText = Utils.getText("MRI_PA_TEMPORAL_FILTER_OVERLAP") + " " + targetName;
                            } else {
                                atfText = (atfObj.this === "start" ? Utils.getText("MRI_PA_TEMPORAL_FILTER_START") : Utils.getText("MRI_PA_TEMPORAL_FILTER_END")) + " ";
                                if (atfObj.operator) {
                                    atfText += atfObj.operator + " " + Utils.getText("MRI_PA_TEMPORAL_FILTER_DAYS") + " ";
                                }
                                atfText += atfObj.after_before + " " + atfObj.other + " " + Utils.getText("MRI_PA_TEMPORAL_FILTER_OF") + " " + targetName;
                            }
                            constraintArray.push({ value: atfText });
                        }

                        attributeObj = { constraints: { content: constraintArray }, configPath: "_advanceTimeFilter" };
                        attributes.push(attributeObj);
                    }


                    var constraintFinishAddition = -1;
                    var previousAttributeTagLine = -1;
                    var boolExcludedAttribute;

                    for (var iii = 0; iii < attributes.length; iii++) {
                        boolExcludedAttribute = false;
                        if (previousAttributeTagLine === 0) {
                            currentY += pdfConst.filterCardBetweenAttributeLarge;
                        } else if (previousAttributeTagLine > 0) {
                            currentY += pdfConst.filterCardBetweenAttributeConstraintLarge;
                        } else {
                            currentY += pdfConst.filterCardFirstAttributeLarge + pdfConst.filterCardFontHeight;
                        }

                        if (attributes[iii].configPath.indexOf("_absTime") > -1) {
                            attributeObj = { name: Utils.getText("MRI_PA_FILTERCARD_CONSTRAINT_TIME") };
                        } else if (attributes[iii].configPath.indexOf("_parentInteraction") > -1) {
                            attributeObj = { name: Utils.getText("MRI_PA_FILTERCARD_CONSTRAINT_PARENT") };
                        } else if (attributes[iii].configPath.indexOf("_successor") > -1) {
                            attributeObj = { name: Utils.getText("MRI_PA_FILTERCARD_CONSTRAINT_SUCCESSOR") };
                        } else if (attributes[iii].configPath.indexOf("_advanceTimeFilter") > -1) {
                            attributeObj = { name: Utils.getText("MRI_PA_TEMPORAL_FILTER_ADVANCED_TIME_FILTER") };
                        } else if (attributes[iii].configPath.indexOf("_excluded") > -1) {
                            attributeObj = { name: Utils.getText("MRI_PA_LABEL_EXCLUDED") };
                            boolExcludedAttribute = true;
                        } else {
                            attributeObj = configInfo.getAttributeByPath(attributes[iii].configPath)._oInternalConfigAttribute;
                        }
                        var attributeName;

                        if (!boolExcludedAttribute) {
                            attributeName = "• " + attributeObj.name + ":";
                        } else {
                            attributeName = "• " + attributeObj.name;
                            targetArray.push({
                                op: "setFontType",
                                params: ["bold"]
                            });
                        }
                        var splitName = pdf.splitTextToSize(attributeName, filterCardWidthContent);
                        var attributeLength = pdf.getStringUnitWidth(attributeName) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;

                        if (((getFilterTextHeight(splitName.length) + currentY > yLimit) || (getFilterTextHeight(1) + pdfConst.smallBoxMargin + currentY > yLimit)) && !filterCardOverflow) {
                            newY = pdfConst.pageTopMargin + pdfConst.largeBoxMargin + (pdfConst.pageHeight - pdfConst.pageBottomMargin);
                            yIfOff = (pdfConst.pageHeight - pdfConst.pageBottomMargin);
                            currentY = newY;
                            targetArray = nextPageCommands;
                            pageOverflow = true;
                            filterCardOverflow = true;

                            targetArray.push({
                                op: "setTextColor",
                                params: [0, 0, 0]
                            });
                            targetArray.push({
                                op: "setDrawColor",
                                params: [0, 0, 0]
                            });

                            targetArray.push({
                                op: "setFontSize",
                                params: [pdfConst.filterCardsFont]
                            });
                        }

                        var cConst = attributes[iii].constraints.content;
                        if (cConst.length === 0) {
                            cConst.push({ op: "=", value: Utils.getText("MRI_PA_INPUT_PLACEHOLDER_ALL") });
                        }

                        var constraintText;
                        if (splitName.length > 1) {
                            previousAttributeTagLine = 1;
                            targetArray.push({
                                op: "text",
                                params: [xStart, currentY + pdfConst.filterCardFontHeight - yIfOff, splitName]
                            });
                            currentY += pdfConst.smallBoxMargin + getFilterTextHeight(splitName.length);
                        } else {

                            //Look-ahead for the first constraint
                            constraintText = parseConstraint(cConst[0]);
                            var constraintLength = pdf.getStringUnitWidth(constraintText) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;

                            if (constraintLength + (pdfConst.smallBoxMargin) + attributeLength > filterCardWidthContent) {
                                if (previousAttributeTagLine === 0) {
                                    currentY += (pdfConst.filterCardBetweenAttribute - pdfConst.filterCardBetweenAttributeLarge);
                                } else if (previousAttributeTagLine > 0) {
                                    currentY += (pdfConst.filterCardBetweenAttributeConstraint - pdfConst.filterCardBetweenAttributeConstraintLarge);
                                } else {
                                    currentY += (pdfConst.filterCardFirstAttribute - pdfConst.filterCardFirstAttributeLarge);
                                }
                                previousAttributeTagLine = 1;
                            } else {
                                previousAttributeTagLine = 0;
                            }

                            targetArray.push({
                                op: "text",
                                params: [xStart, currentY + pdfConst.filterCardFontHeight - yIfOff, splitName]
                            });

                            currentY -= pdfConst.smallBoxMargin;
                            currentX = xStart + attributeLength;
                        }

                        targetArray.push({
                            op: "setTextColor",
                            params: [pdfConst.filterCardColor.R, pdfConst.filterCardColor.G, pdfConst.filterCardColor.B]
                        });

                        targetArray.push({
                            op: "setDrawColor",
                            params: [pdfConst.filterCardColor.R, pdfConst.filterCardColor.G, pdfConst.filterCardColor.B]
                        });

                        if (boolExcludedAttribute) {
                            targetArray.push({
                                op: "setFontType",
                                params: ["normal"]
                            });
                        }

                        for (var iv = 0; iv < cConst.length; iv++) {
                            constraintText = parseConstraint(cConst[iv]);
                            var xOffset = 0;
                            constraintLength = pdf.getStringUnitWidth(constraintText) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
                            if (constraintLength < pdfConst.constraintMinLength) {
                                xOffset = (pdfConst.constraintMinLength - constraintLength) / 2;
                                constraintLength = pdfConst.constraintMinLength;
                            }

                            if (constraintLength + (pdfConst.smallBoxMargin * 2) + currentX - xStart > filterCardWidthContent) {
                                previousAttributeTagLine = 1;
                                if (currentX !== xStart) {
                                    currentY += (pdfConst.smallBoxMargin * 2) + pdfConst.filterCardFontHeight;
                                    currentY += pdfConst.constraintNextLine;
                                }
                                currentX = xStart + pdfConst.smallBoxMargin;
                            } else {
                                currentX += pdfConst.smallBoxMargin;
                            }

                            var splitBox = pdf.splitTextToSize(constraintText, filterCardWidthContent - pdfConst.smallBoxMargin - (currentX - xStart));

                            if ((getFilterTextHeight(splitBox.length) + currentY + (pdfConst.smallBoxMargin * 2) > yLimit) && !filterCardOverflow) {
                                newY = pdfConst.pageTopMargin + pdfConst.largeBoxMargin + (pdfConst.pageHeight - pdfConst.pageBottomMargin);
                                yIfOff = (pdfConst.pageHeight - pdfConst.pageBottomMargin);
                                currentY = newY;
                                targetArray = nextPageCommands;
                                pageOverflow = true;
                                filterCardOverflow = true;

                                targetArray.push({
                                    op: "setTextColor",
                                    params: [pdfConst.filterCardColor.R, pdfConst.filterCardColor.G, pdfConst.filterCardColor.B]
                                });

                                targetArray.push({
                                    op: "setDrawColor",
                                    params: [pdfConst.filterCardColor.R, pdfConst.filterCardColor.G, pdfConst.filterCardColor.B]
                                });

                                targetArray.push({
                                    op: "setFontSize",
                                    params: [pdfConst.filterCardsFont]
                                });
                            }
                            var rectLength = (pdfConst.smallBoxMargin * 2) + constraintLength;
                            if (rectLength > filterCardWidthContent || splitBox.length > 1) {
                                rectLength = filterCardWidthContent;
                            }

                            if (!boolExcludedAttribute) {
                                targetArray.push({
                                    op: "text",
                                    params: [currentX + xOffset + pdfConst.smallBoxMargin, currentY + pdfConst.smallBoxMargin + pdfConst.filterCardFontHeight - yIfOff, splitBox]
                                });

                                targetArray.push({
                                    op: "rect",
                                    params: [currentX, currentY - yIfOff, rectLength, 2 * pdfConst.smallBoxMargin + getFilterTextHeight(splitBox.length)]
                                });
                            }

                            if (splitBox.length > 1) {
                                previousAttributeTagLine = 1;
                                constraintFinishAddition = 0;
                                currentY += (pdfConst.smallBoxMargin * 2) + getFilterTextHeight(splitBox.length);
                                currentX = xStart;
                            } else {
                                constraintFinishAddition = (pdfConst.smallBoxMargin * 2) + getFilterTextHeight(splitBox.length);
                                currentX += constraintLength + (pdfConst.smallBoxMargin * 2);

                            }
                        }

                        currentY += constraintFinishAddition;

                        targetArray.push({
                            op: "setTextColor",
                            params: [0, 0, 0]
                        });

                        targetArray.push({
                            op: "setDrawColor",
                            params: [0, 0, 0]
                        });

                        pdf.setTextColor(0, 0, 0);
                        pdf.setDrawColor(0, 0, 0);

                        if (currentY > maxY) {
                            maxY = currentY;
                        }
                    }

                    //Draw Box if Row is completed
                    currentProcessed++;
                    if (currentProcessed === pdfConst.filterCardPerRow) {

                        var yEnd = pageOverflow ? pdfConst.pageHeight - pdfConst.pageBottomMargin : maxY + pdfConst.filterCardBottomMargin;
                        var xEnd = pdfConst.pageLeftMargin + (filterCardWidth * currentProcessed);
                        var yEndNext = maxY - (pdfConst.pageHeight - pdfConst.pageBottomMargin) + pdfConst.pageTopMargin + pdfConst.filterCardBottomMargin;

                        pageCommands.push({
                            op: "setDrawColor",
                            params: [pdfConst.filterCardBorderColor.R, pdfConst.filterCardBorderColor.G, pdfConst.filterCardBorderColor.B]
                        });

                        pageCommands.push({
                            op: "line",
                            params: [pdfConst.pageLeftMargin, yStart, pdfConst.pageLeftMargin, yEnd]
                        });
                        pageCommands.push({
                            op: "line",
                            params: [xEnd, yStart, xEnd, yEnd]
                        });
                        pageCommands.push({
                            op: "line",
                            params: [pdfConst.pageLeftMargin, yStart, xEnd, yStart]
                        });
                        pageCommands.push({
                            op: "line",
                            params: [pdfConst.pageLeftMargin, yEnd, xEnd, yEnd]
                        });

                        if (pageOverflow) {
                            nextPageCommands.push({
                                op: "setDrawColor",
                                params: [pdfConst.filterCardBorderColor.R, pdfConst.filterCardBorderColor.G, pdfConst.filterCardBorderColor.B]
                            });

                            nextPageCommands.push({
                                op: "line",
                                params: [pdfConst.pageLeftMargin, pdfConst.pageTopMargin, pdfConst.pageLeftMargin, yEndNext]
                            });
                            nextPageCommands.push({
                                op: "line",
                                params: [xEnd, pdfConst.pageTopMargin, xEnd, yEndNext]
                            });
                            nextPageCommands.push({
                                op: "line",
                                params: [pdfConst.pageLeftMargin, pdfConst.pageTopMargin, xEnd, pdfConst.pageTopMargin]
                            });
                            nextPageCommands.push({
                                op: "line",
                                params: [pdfConst.pageLeftMargin, yEndNext, xEnd, yEndNext]
                            });
                        }

                        for (var ii = 0; ii < currentProcessed; ii++) {
                            pageCommands.push({
                                op: "line",
                                params: [pdfConst.pageLeftMargin + (filterCardWidth * ii), yStart + pdfConst.largeBoxMargin, pdfConst.pageLeftMargin + (filterCardWidth * ii), yEnd - pdfConst.largeBoxMargin]
                            });
                            if (pageOverflow) {
                                nextPageCommands.push({
                                    op: "line",
                                    params: [pdfConst.pageLeftMargin + (filterCardWidth * ii), pdfConst.pageTopMargin + pdfConst.largeBoxMargin, pdfConst.pageLeftMargin + (filterCardWidth * ii), yEndNext - pdfConst.largeBoxMargin]
                                });
                            }
                        }

                        currentProcessed = 0;
                        yStart = maxY + pdfConst.filterCardBottomMargin;

                        if (pageOverflow) {
                            yStart = yEndNext + 1;
                            pdfCommands.push({ commands: pageCommands });
                            pageCommands = nextPageCommands;
                            nextPageCommands = [];
                            nextPageCommands = printChartTitle(nextPageCommands);
                            pageOverflow = false;
                        }

                        maxY = yStart + 1;
                    }
                }

                if (currentProcessed > 0) {
                    yEnd = pageOverflow ? pdfConst.pageHeight - pdfConst.pageBottomMargin : maxY + pdfConst.filterCardBottomMargin;
                    xEnd = pdfConst.pageLeftMargin + (filterCardWidth * currentProcessed);
                    yEndNext = maxY - (pdfConst.pageHeight - pdfConst.pageBottomMargin) + pdfConst.pageTopMargin + pdfConst.filterCardBottomMargin;

                    pageCommands.push({
                        op: "setDrawColor",
                        params: [pdfConst.filterCardBorderColor.R, pdfConst.filterCardBorderColor.G, pdfConst.filterCardBorderColor.B]
                    });

                    pageCommands.push({
                        op: "line",
                        params: [pdfConst.pageLeftMargin, yStart, pdfConst.pageLeftMargin, yEnd]
                    });
                    pageCommands.push({
                        op: "line",
                        params: [xEnd, yStart, xEnd, yEnd]
                    });
                    pageCommands.push({
                        op: "line",
                        params: [pdfConst.pageLeftMargin, yStart, xEnd, yStart]
                    });
                    pageCommands.push({
                        op: "line",
                        params: [pdfConst.pageLeftMargin, yEnd, xEnd, yEnd]
                    });

                    if (pageOverflow) {
                        nextPageCommands.push({
                            op: "setDrawColor",
                            params: [pdfConst.filterCardBorderColor.R, pdfConst.filterCardBorderColor.G, pdfConst.filterCardBorderColor.B]
                        });
                        nextPageCommands.push({
                            op: "line",
                            params: [pdfConst.pageLeftMargin, pdfConst.pageTopMargin, pdfConst.pageLeftMargin, yEndNext]
                        });
                        nextPageCommands.push({
                            op: "line",
                            params: [xEnd, pdfConst.pageTopMargin, xEnd, yEndNext]
                        });
                        nextPageCommands.push({
                            op: "line",
                            params: [pdfConst.pageLeftMargin, pdfConst.pageTopMargin, xEnd, pdfConst.pageTopMargin]
                        });
                        nextPageCommands.push({
                            op: "line",
                            params: [pdfConst.pageLeftMargin, yEndNext, xEnd, yEndNext]
                        });
                    }

                    for (ii = 0; ii < currentProcessed; ii++) {
                        pageCommands.push({
                            op: "line",
                            params: [pdfConst.pageLeftMargin + (filterCardWidth * ii), yStart + pdfConst.largeBoxMargin, pdfConst.pageLeftMargin + (filterCardWidth * ii), yEnd - pdfConst.largeBoxMargin]
                        });
                        if (pageOverflow) {
                            nextPageCommands.push({
                                op: "line",
                                params: [pdfConst.pageLeftMargin + (filterCardWidth * ii), pdfConst.pageTopMargin + pdfConst.largeBoxMargin, pdfConst.pageLeftMargin + (filterCardWidth * ii), yEndNext - pdfConst.largeBoxMargin]
                            });
                        }
                    }

                    currentProcessed = 0;
                    yStart = maxY + pdfConst.filterCardBottomMargin;

                    if (pageOverflow) {
                        yStart = yEndNext + 1;
                        pdfCommands.push({ commands: pageCommands });
                        pageCommands = nextPageCommands;
                        nextPageCommands = [];
                        nextPageCommands = printChartTitle(nextPageCommands);
                        pageOverflow = false;
                    }

                    maxY = yStart + 1;
                }

                //For Loop: OR
                fcArray = bookmark.cards.content[1].content;
                fcIcon = sap.ui.core.IconPool.getIconInfo("sap-icon://MRI/bool-or");

                if (fcArray.length > 0) {
                    yStart += pdfConst.filterCardFontHeight;
                    var orFilterCardTitle = Utils.getText("MRI_PA_MATCH_ANY").replace("<strong>", "").replace("</strong>", "");
                    pageCommands.push({
                        op: "text",
                        params: [pdfConst.pageLeftMargin, yStart + pdfConst.filterCardFontHeight, orFilterCardTitle]
                    });
                    yStart += 2 * pdfConst.filterCardFontHeight;
                }
                maxY = yStart + 1;


                for (i = 0; i < fcArray.length; i++) {
                    filterCardObj = fcArray[i];
                    exclude = (filterCardObj.op === "NOT");
                    if (exclude) {
                        filterCardObj = filterCardObj.content[0];
                    }
                    //Offsets:
                    yIfOff = 0;
                    targetArray = pageCommands;
                    filterCardOverflow = false;

                    xStart = currentProcessed * filterCardWidth + pdfConst.pageLeftMargin;

                    currentY = yStart + pdfConst.largeBoxMargin;

                    //Filtercard Title
                    pdf.setFontSize(pdfConst.filterCardsFont);
                    pdf.setTextColor(0, 0, 0);
                    pdf.setFontType("bold");

                    splitTitle = pdf.splitTextToSize(filterCardObj.name, filterCardWidthContent + pdfConst.axisIconHmargin);

                    if ((getFilterTextHeight(splitTitle.length) + currentY > yLimit) && !filterCardOverflow) {
                        newY = pdfConst.pageTopMargin + pdfConst.largeBoxMargin + (pdfConst.pageHeight - pdfConst.pageBottomMargin);
                        yIfOff = (pdfConst.pageHeight - pdfConst.pageBottomMargin);
                        currentY = newY;
                        targetArray = nextPageCommands;
                        pageOverflow = true;
                        filterCardOverflow = true;
                    }

                    targetArray.push({
                        op: "setFontSize",
                        params: [pdfConst.filterCardsFont]
                    });
                    targetArray.push({
                        op: "setTextColor",
                        params: [0, 0, 0]
                    });
                    targetArray.push({
                        op: "setFontType",
                        params: ["bold"]
                    });

                    targetArray.push({
                        op: "addImage",
                        params: [getJpegIcon(fcIcon.content, fcIcon.fontFamily, pdfConst.iconFont, pdfConst.iconWidth, pdfConst.iconHeight), "jpeg", xStart + pdfConst.largeBoxMarginInternal, currentY - yIfOff]
                    });

                    xStart += pdfConst.iconWidth + pdfConst.axisIconHmargin + pdfConst.largeBoxMarginInternal;
                    targetArray.push({
                        op: "text",
                        params: [xStart, currentY + pdfConst.iconHeight - yIfOff - pdfConst.filterCardTitleMargin, splitTitle]
                    });
                    targetArray.push({
                        op: "setFontType",
                        params: ["normal"]
                    });
                    pdf.setFontType("normal");
                    currentY += getFilterTextHeight(splitTitle.length) + pdfConst.filterCardTitleMargin;

                    attributes = filterCardObj.attributes.content;

                    if (exclude) {
                        constraintArray = [];
                        attributeObj = { constraints: { content: constraintArray }, configPath: "_excluded" };
                        attributes.unshift(attributeObj);
                    }

                    if (filterCardObj.parentInteraction) {

                        targetName = filterCardObj.parentInteraction;
                        constraintArray = [];
                        for (iii = 0; iii < andFilterCard.length; iii++) {
                            if (andFilterCard[iii].instanceID === targetName) {
                                targetName = andFilterCard[iii].name;
                                break;
                            }
                        }
                        constraintArray.push({ value: targetName });
                        attributeObj = { constraints: { content: constraintArray }, configPath: "_parentInteraction" };
                        attributes.push(attributeObj);
                    }

                    if (filterCardObj.successor) {

                        targetName = filterCardObj.successor.id;
                        constraintArray = [];
                        for (iii = 0; iii < andFilterCard.length; iii++) {
                            if (andFilterCard[iii].instanceID === targetName) {
                                targetName = andFilterCard[iii].name;
                                break;
                            }
                        }

                        dateRange = filterCardObj.successor.minDaysBetween;

                        if (filterCardObj.successor.maxDaysBetween) {
                            dateRange = dateRange + " - " + filterCardObj.successor.maxDaysBetween + " " + Utils.getText("MRI_PA_TEMPORAL_FILTER_DAYS") + " " + Utils.getText("MRI_PA_TEMPORAL_FILTER_BEFORE_START") + " " + Utils.getText("MRI_PA_TEMPORAL_FILTER_OF") + " ";
                        } else {
                            dateRange = ">" + dateRange + " " + Utils.getText("MRI_PA_TEMPORAL_FILTER_DAYS") + " " + Utils.getText("MRI_PA_TEMPORAL_FILTER_BEFORE_START") + " " + Utils.getText("MRI_PA_TEMPORAL_FILTER_OF") + " ";
                        }

                        targetName = dateRange + targetName;

                        constraintArray.push({ value: targetName });
                        attributeObj = { constraints: { content: constraintArray }, configPath: "_successor" };
                        attributes.push(attributeObj);
                    }

                    if (filterCardObj.advanceTimeFilter) {

                        constraintArray = [];

                        for (ii = 0; ii < filterCardObj.advanceTimeFilter.filters.length; ii++) {
                            atfObj = filterCardObj.advanceTimeFilter.filters[ii];
                            atfText = "";
                            targetName = atfObj.value;

                            for (iii = 0; iii < andFilterCard.length; iii++) {
                                if (andFilterCard[iii].instanceID === targetName) {
                                    targetName = andFilterCard[iii].name;
                                    break;
                                }
                            }

                            if (atfObj.this === "overlap") {
                                atfText = Utils.getText("MRI_PA_TEMPORAL_FILTER_OVERLAP") + " " + targetName;
                            } else {
                                atfText = (atfObj.this === "start" ? Utils.getText("MRI_PA_TEMPORAL_FILTER_START") : Utils.getText("MRI_PA_TEMPORAL_FILTER_END")) + " ";
                                if (atfObj.operator) {
                                    atfText += atfObj.operator + " " + Utils.getText("MRI_PA_TEMPORAL_FILTER_DAYS") + " ";
                                }
                                atfText += atfObj.after_before + " " + atfObj.other + " " + Utils.getText("MRI_PA_TEMPORAL_FILTER_OF") + " " + targetName;
                            }
                            constraintArray.push({ value: atfText });
                        }

                        attributeObj = { constraints: { content: constraintArray }, configPath: "_advanceTimeFilter" };
                        attributes.push(attributeObj);
                    }


                    constraintFinishAddition = -1;
                    previousAttributeTagLine = -1;

                    for (iii = 0; iii < attributes.length; iii++) {
                        boolExcludedAttribute = false;
                        if (previousAttributeTagLine === 0) {
                            currentY += pdfConst.filterCardBetweenAttributeLarge;
                        } else if (previousAttributeTagLine > 0) {
                            currentY += pdfConst.filterCardBetweenAttributeConstraintLarge;
                        } else {
                            currentY += pdfConst.filterCardFirstAttributeLarge + pdfConst.filterCardFontHeight;
                        }

                        if (attributes[iii].configPath.indexOf("_absTime") > -1) {
                            attributeObj = { name: Utils.getText("MRI_PA_FILTERCARD_CONSTRAINT_TIME") };
                        } else if (attributes[iii].configPath.indexOf("_parentInteraction") > -1) {
                            attributeObj = { name: Utils.getText("MRI_PA_FILTERCARD_CONSTRAINT_PARENT") };
                        } else if (attributes[iii].configPath.indexOf("_successor") > -1) {
                            attributeObj = { name: Utils.getText("MRI_PA_FILTERCARD_CONSTRAINT_SUCCESSOR") };
                        } else if (attributes[iii].configPath.indexOf("_advanceTimeFilter") > -1) {
                            attributeObj = { name: Utils.getText("MRI_PA_TEMPORAL_FILTER_ADVANCED_TIME_FILTER") };
                        } else if (attributes[iii].configPath.indexOf("_excluded") > -1) {
                            attributeObj = { name: Utils.getText("MRI_PA_LABEL_EXCLUDED") };
                            boolExcludedAttribute = true;
                        } else {
                            attributeObj = configInfo.getAttributeByPath(attributes[iii].configPath)._oInternalConfigAttribute;
                        }

                        if (!boolExcludedAttribute) {
                            attributeName = "• " + attributeObj.name + ":";
                        } else {
                            attributeName = "• " + attributeObj.name;
                            targetArray.push({
                                op: "setFontType",
                                params: ["bold"]
                            });
                        }
                        splitName = pdf.splitTextToSize(attributeName, filterCardWidthContent);
                        attributeLength = pdf.getStringUnitWidth(attributeName) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;

                        if (((getFilterTextHeight(splitName.length) + currentY > yLimit) || (getFilterTextHeight(1) + pdfConst.smallBoxMargin + currentY > yLimit)) && !filterCardOverflow) {
                            newY = pdfConst.pageTopMargin + pdfConst.largeBoxMargin + (pdfConst.pageHeight - pdfConst.pageBottomMargin);
                            yIfOff = (pdfConst.pageHeight - pdfConst.pageBottomMargin);
                            currentY = newY;
                            targetArray = nextPageCommands;
                            pageOverflow = true;
                            filterCardOverflow = true;

                            targetArray.push({
                                op: "setTextColor",
                                params: [0, 0, 0]
                            });
                            targetArray.push({
                                op: "setDrawColor",
                                params: [0, 0, 0]
                            });

                            targetArray.push({
                                op: "setFontSize",
                                params: [pdfConst.filterCardsFont]
                            });
                        }

                        cConst = attributes[iii].constraints.content;
                        if (cConst.length === 0) {
                            cConst.push({ op: "=", value: Utils.getText("MRI_PA_INPUT_PLACEHOLDER_ALL") });
                        }

                        if (splitName.length > 1) {
                            previousAttributeTagLine = 1;
                            targetArray.push({
                                op: "text",
                                params: [xStart, currentY + pdfConst.filterCardFontHeight - yIfOff, splitName]
                            });
                            currentY += pdfConst.smallBoxMargin + getFilterTextHeight(splitName.length);
                        } else {

                            //Look-ahead for the first constraint
                            constraintText = parseConstraint(cConst[0]);
                            constraintLength = pdf.getStringUnitWidth(constraintText) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;

                            if (constraintLength + (pdfConst.smallBoxMargin) + attributeLength > filterCardWidthContent) {
                                if (previousAttributeTagLine === 0) {
                                    currentY += (pdfConst.filterCardBetweenAttribute - pdfConst.filterCardBetweenAttributeLarge);
                                } else if (previousAttributeTagLine > 0) {
                                    currentY += (pdfConst.filterCardBetweenAttributeConstraint - pdfConst.filterCardBetweenAttributeConstraintLarge);
                                } else {
                                    currentY += (pdfConst.filterCardFirstAttribute - pdfConst.filterCardFirstAttributeLarge);
                                }
                                previousAttributeTagLine = 1;
                            } else {
                                previousAttributeTagLine = 0;
                            }

                            targetArray.push({
                                op: "text",
                                params: [xStart, currentY + pdfConst.filterCardFontHeight - yIfOff, splitName]
                            });

                            currentY -= pdfConst.smallBoxMargin;
                            currentX = xStart + attributeLength;
                        }

                        targetArray.push({
                            op: "setTextColor",
                            params: [pdfConst.filterCardColor.R, pdfConst.filterCardColor.G, pdfConst.filterCardColor.B]
                        });

                        targetArray.push({
                            op: "setDrawColor",
                            params: [pdfConst.filterCardColor.R, pdfConst.filterCardColor.G, pdfConst.filterCardColor.B]
                        });

                        if (boolExcludedAttribute) {
                            targetArray.push({
                                op: "setFontType",
                                params: ["normal"]
                            });
                        }

                        for (iv = 0; iv < cConst.length; iv++) {
                            constraintText = parseConstraint(cConst[iv]);
                            xOffset = 0;
                            constraintLength = pdf.getStringUnitWidth(constraintText) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
                            if (constraintLength < pdfConst.constraintMinLength) {
                                xOffset = (pdfConst.constraintMinLength - constraintLength) / 2;
                                constraintLength = pdfConst.constraintMinLength;
                            }

                            if (constraintLength + (pdfConst.smallBoxMargin * 2) + currentX - xStart > filterCardWidthContent) {
                                previousAttributeTagLine = 1;
                                if (currentX !== xStart) {
                                    currentY += (pdfConst.smallBoxMargin * 2) + pdfConst.filterCardFontHeight;
                                    currentY += pdfConst.constraintNextLine;
                                }
                                currentX = xStart + pdfConst.smallBoxMargin;
                            } else {
                                currentX += pdfConst.smallBoxMargin;
                            }

                            splitBox = pdf.splitTextToSize(constraintText, filterCardWidthContent - pdfConst.smallBoxMargin - (currentX - xStart));

                            if ((getFilterTextHeight(splitBox.length) + currentY + (pdfConst.smallBoxMargin * 2) > yLimit) && !filterCardOverflow) {
                                newY = pdfConst.pageTopMargin + pdfConst.largeBoxMargin + (pdfConst.pageHeight - pdfConst.pageBottomMargin);
                                yIfOff = (pdfConst.pageHeight - pdfConst.pageBottomMargin);
                                currentY = newY;
                                targetArray = nextPageCommands;
                                pageOverflow = true;
                                filterCardOverflow = true;

                                targetArray.push({
                                    op: "setTextColor",
                                    params: [pdfConst.filterCardColor.R, pdfConst.filterCardColor.G, pdfConst.filterCardColor.B]
                                });

                                targetArray.push({
                                    op: "setDrawColor",
                                    params: [pdfConst.filterCardColor.R, pdfConst.filterCardColor.G, pdfConst.filterCardColor.B]
                                });

                                targetArray.push({
                                    op: "setFontSize",
                                    params: [pdfConst.filterCardsFont]
                                });
                            }
                            rectLength = (pdfConst.smallBoxMargin * 2) + constraintLength;
                            if (rectLength > filterCardWidthContent || splitBox.length > 1) {
                                rectLength = filterCardWidthContent;
                            }

                            if (boolExcludedAttribute) {
                                targetArray.push({
                                    op: "text",
                                    params: [currentX + xOffset + pdfConst.smallBoxMargin, currentY + pdfConst.smallBoxMargin + pdfConst.filterCardFontHeight - yIfOff, splitBox]
                                });

                                targetArray.push({
                                    op: "rect",
                                    params: [currentX, currentY - yIfOff, rectLength, 2 * pdfConst.smallBoxMargin + getFilterTextHeight(splitBox.length)]
                                });
                            }

                            if (splitBox.length > 1) {
                                previousAttributeTagLine = 1;
                                constraintFinishAddition = 0;
                                currentY += (pdfConst.smallBoxMargin * 2) + getFilterTextHeight(splitBox.length);
                                currentX = xStart;
                            } else {
                                constraintFinishAddition = (pdfConst.smallBoxMargin * 2) + getFilterTextHeight(splitBox.length);
                                currentX += constraintLength + (pdfConst.smallBoxMargin * 2);

                            }
                        }

                        currentY += constraintFinishAddition;

                        targetArray.push({
                            op: "setTextColor",
                            params: [0, 0, 0]
                        });

                        targetArray.push({
                            op: "setDrawColor",
                            params: [0, 0, 0]
                        });

                        pdf.setTextColor(0, 0, 0);
                        pdf.setDrawColor(0, 0, 0);

                        if (currentY > maxY) {
                            maxY = currentY;
                        }
                    }

                    //Draw Box if Row is completed
                    currentProcessed++;
                    if (currentProcessed === pdfConst.filterCardPerRow) {

                        yEnd = pageOverflow ? pdfConst.pageHeight - pdfConst.pageBottomMargin : maxY + pdfConst.filterCardBottomMargin;
                        xEnd = pdfConst.pageLeftMargin + (filterCardWidth * currentProcessed);
                        yEndNext = maxY - (pdfConst.pageHeight - pdfConst.pageBottomMargin) + pdfConst.pageTopMargin + pdfConst.filterCardBottomMargin;

                        pageCommands.push({
                            op: "setDrawColor",
                            params: [pdfConst.filterCardBorderColor.R, pdfConst.filterCardBorderColor.G, pdfConst.filterCardBorderColor.B]
                        });

                        pageCommands.push({
                            op: "line",
                            params: [pdfConst.pageLeftMargin, yStart, pdfConst.pageLeftMargin, yEnd]
                        });
                        pageCommands.push({
                            op: "line",
                            params: [xEnd, yStart, xEnd, yEnd]
                        });
                        pageCommands.push({
                            op: "line",
                            params: [pdfConst.pageLeftMargin, yStart, xEnd, yStart]
                        });
                        pageCommands.push({
                            op: "line",
                            params: [pdfConst.pageLeftMargin, yEnd, xEnd, yEnd]
                        });

                        if (pageOverflow) {
                            nextPageCommands.push({
                                op: "setDrawColor",
                                params: [pdfConst.filterCardBorderColor.R, pdfConst.filterCardBorderColor.G, pdfConst.filterCardBorderColor.B]
                            });

                            nextPageCommands.push({
                                op: "line",
                                params: [pdfConst.pageLeftMargin, pdfConst.pageTopMargin, pdfConst.pageLeftMargin, yEndNext]
                            });
                            nextPageCommands.push({
                                op: "line",
                                params: [xEnd, pdfConst.pageTopMargin, xEnd, yEndNext]
                            });
                            nextPageCommands.push({
                                op: "line",
                                params: [pdfConst.pageLeftMargin, pdfConst.pageTopMargin, xEnd, pdfConst.pageTopMargin]
                            });
                            nextPageCommands.push({
                                op: "line",
                                params: [pdfConst.pageLeftMargin, yEndNext, xEnd, yEndNext]
                            });
                        }

                        for (ii = 0; ii < currentProcessed; ii++) {
                            pageCommands.push({
                                op: "line",
                                params: [pdfConst.pageLeftMargin + (filterCardWidth * ii), yStart + pdfConst.largeBoxMargin, pdfConst.pageLeftMargin + (filterCardWidth * ii), yEnd - pdfConst.largeBoxMargin]
                            });
                            if (pageOverflow) {
                                nextPageCommands.push({
                                    op: "line",
                                    params: [pdfConst.pageLeftMargin + (filterCardWidth * ii), pdfConst.pageTopMargin + pdfConst.largeBoxMargin, pdfConst.pageLeftMargin + (filterCardWidth * ii), yEndNext - pdfConst.largeBoxMargin]
                                });
                            }
                        }

                        currentProcessed = 0;
                        yStart = maxY + pdfConst.filterCardBottomMargin;

                        if (pageOverflow) {
                            yStart = yEndNext + 1;
                            pdfCommands.push({ commands: pageCommands });
                            pageCommands = nextPageCommands;
                            nextPageCommands = [];
                            nextPageCommands = printChartTitle(nextPageCommands);
                            pageOverflow = false;
                        }

                        maxY = yStart + 1;
                    }
                }

                if (currentProcessed > 0) {
                    yEnd = pageOverflow ? pdfConst.pageHeight - pdfConst.pageBottomMargin : maxY + pdfConst.filterCardBottomMargin;
                    xEnd = pdfConst.pageLeftMargin + (filterCardWidth * currentProcessed);
                    yEndNext = maxY - (pdfConst.pageHeight - pdfConst.pageBottomMargin) + pdfConst.pageTopMargin + pdfConst.filterCardBottomMargin;

                    pageCommands.push({
                        op: "setDrawColor",
                        params: [pdfConst.filterCardBorderColor.R, pdfConst.filterCardBorderColor.G, pdfConst.filterCardBorderColor.B]
                    });

                    pageCommands.push({
                        op: "line",
                        params: [pdfConst.pageLeftMargin, yStart, pdfConst.pageLeftMargin, yEnd]
                    });
                    pageCommands.push({
                        op: "line",
                        params: [xEnd, yStart, xEnd, yEnd]
                    });
                    pageCommands.push({
                        op: "line",
                        params: [pdfConst.pageLeftMargin, yStart, xEnd, yStart]
                    });
                    pageCommands.push({
                        op: "line",
                        params: [pdfConst.pageLeftMargin, yEnd, xEnd, yEnd]
                    });

                    if (pageOverflow) {
                        nextPageCommands.push({
                            op: "setDrawColor",
                            params: [pdfConst.filterCardBorderColor.R, pdfConst.filterCardBorderColor.G, pdfConst.filterCardBorderColor.B]
                        });
                        nextPageCommands.push({
                            op: "line",
                            params: [pdfConst.pageLeftMargin, pdfConst.pageTopMargin, pdfConst.pageLeftMargin, yEndNext]
                        });
                        nextPageCommands.push({
                            op: "line",
                            params: [xEnd, pdfConst.pageTopMargin, xEnd, yEndNext]
                        });
                        nextPageCommands.push({
                            op: "line",
                            params: [pdfConst.pageLeftMargin, pdfConst.pageTopMargin, xEnd, pdfConst.pageTopMargin]
                        });
                        nextPageCommands.push({
                            op: "line",
                            params: [pdfConst.pageLeftMargin, yEndNext, xEnd, yEndNext]
                        });
                    }

                    for (ii = 0; ii < currentProcessed; ii++) {
                        pageCommands.push({
                            op: "line",
                            params: [pdfConst.pageLeftMargin + (filterCardWidth * ii), yStart + pdfConst.largeBoxMargin, pdfConst.pageLeftMargin + (filterCardWidth * ii), yEnd - pdfConst.largeBoxMargin]
                        });
                        if (pageOverflow) {
                            nextPageCommands.push({
                                op: "line",
                                params: [pdfConst.pageLeftMargin + (filterCardWidth * ii), pdfConst.pageTopMargin + pdfConst.largeBoxMargin, pdfConst.pageLeftMargin + (filterCardWidth * ii), yEndNext - pdfConst.largeBoxMargin]
                            });
                        }
                    }

                    currentProcessed = 0;
                    yStart = maxY + pdfConst.filterCardBottomMargin;

                    if (pageOverflow) {
                        yStart = yEndNext + 1;
                        pdfCommands.push({ commands: pageCommands });
                        pageCommands = nextPageCommands;
                        nextPageCommands = [];
                        nextPageCommands = printChartTitle(nextPageCommands);
                        pageOverflow = false;
                    }

                    maxY = yStart + 1;
                }
                yStart += pdfConst.sectionFooterBottomMargin;
            }

            //Draw Details
            if (pdfParam.includeDetails && !(chartType === "list")) {

                //Part 1: Details Header
                rowCommands = [];

                colArray = [];
                yOffset = yStart - pdfConst.pageTopMargin;
                xStart = pdfConst.pageLeftMargin;
                rowCommands.push({
                    op: "setFontSize",
                    params: [pdfConst.sectionHeaderFont]
                });
                pdf.setFontSize(pdfConst.sectionHeaderFont);

                var detailIcon = sap.ui.core.IconPool.getIconInfo("sap-icon://filter");
                rowCommands.push({
                    op: "setDrawColor",
                    params: [0, 0, 0]
                });
                rowCommands.push({
                    op: "addImage",
                    params: [getJpegIcon(detailIcon.content, detailIcon.fontFamily, pdfConst.iconFont, pdfConst.iconWidth, pdfConst.iconHeight), "jpeg", xStart + pdfConst.sectionHeaderIconMargin, yStart]
                });
                rowCommands.push({
                    op: "text",
                    params: [xStart + pdfConst.iconWidth + (pdfConst.sectionHeaderIconMargin * 2), yStart + pdfConst.iconHeight - 1, Utils.getText("MRI_PA_DOWNLOAD_PDF_TEXT_DETAILS")]
                });

                yStart += pdfConst.iconHeight + pdfConst.sectionHeaderTopLineMargin;
                rowCommands.push({
                    op: "line",
                    params: [pdfConst.pageLeftMargin, yStart, pdfConst.pageWidth - pdfConst.pageRightMargin, yStart]
                });

                yStart += pdfConst.sectionHeaderBottomLineMargin;
                rowCommands.push({
                    op: "setFontSize",
                    params: [pdfConst.axisInfoFont]
                });
                pdf.setFontSize(pdfConst.axisInfoFont);
                rowCommands.push({
                    op: "setFontType",
                    params: ["bold"]
                });
                pdf.setFontType("bold");

                //Part 2: Axis Information Box

                var yPos = yStart + pdfConst.largeBoxMargin;
                var xBase = xStart + pdfConst.largeBoxMargin + pdfConst.largeBoxMarginInternal;

                var xyIcon = sap.ui.core.IconPool.getIconInfo("sap-icon://chart-axis");
                rowCommands.push({
                    op: "addImage",
                    params: [getJpegIcon(xyIcon.content, xyIcon.fontFamily, pdfConst.iconFont, pdfConst.iconWidth, pdfConst.iconHeight), "jpeg", xBase, yPos]
                });
                rowCommands.push({
                    op: "text",
                    params: [xBase + pdfConst.iconHMargin + pdfConst.iconWidth, yPos + pdfConst.iconHeight - pdfConst.filterCardTitleMargin, Utils.getText("MRI_PA_DOWNLOAD_PDF_TEXT_AXIS_INFO")]
                });
                rowCommands.push({
                    op: "setFontType",
                    params: ["normal"]
                });
                pdf.setFontType("normal");

                yPos += pdfConst.axisInfoHeaderBottomMargin + pdfConst.filterCardFirstAttributeLarge;
                xBase += pdfConst.iconHMargin + pdfConst.iconWidth;
                var xPos = xBase;

                var axisAttributes = axisInformation.attr;
                var axisAttributesIcon = axisLocationInformation;
                var additionalVIconMargin = (pdfConst.axisInfoFontHeight + (2 * pdfConst.smallBoxMargin) - pdfConst.iconHeight) / 2;
                var rightMarginReached = false;
                var axisInfoMaxWidth = pdfConst.pageWidth - pdfConst.pageRightMargin - pdfConst.largeBoxMargin - pdfConst.largeBoxMarginInternal;

                //X-Axis
                for (i = 0; i < 3; i++) {
                    var axisIconURI = axisAttributesIcon.attr[i].icon;
                    var axisIcon = sap.ui.core.IconPool.getIconInfo(axisIconURI);

                    if (axisAttributes[i].selection && axisAttributes[i].selection !== "n/a") {
                        attributeObj = configInfo.getAttributeByPath(axisAttributes[i].selection)._oInternalConfigAttribute;
                        attributeName = attributeObj.name;

                        var validFilterCards = bookmark.cards.content[0].content;
                        var parentFilterCardName = "";

                        for (ii = 0; ii < validFilterCards.length; ii++) {
                            if (axisAttributes[i].selection.indexOf(validFilterCards[ii].instanceID) > -1) {
                                parentFilterCardName = validFilterCards[ii].name;
                            }
                        }

                        var attributeLongName = parentFilterCardName + " > " + attributeName;
                        attributeLength = pdf.getStringUnitWidth(attributeLongName) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;

                        var totalLength = (2 * pdfConst.axisIconHmargin) + pdfConst.iconWidth + (2 * pdfConst.smallBoxMargin) + attributeLength;

                        if (totalLength + xPos > axisInfoMaxWidth) {
                            yPos += (pdfConst.smallBoxMargin * 2) + pdfConst.axisInfoFontHeight + pdfConst.axisInfoMarginBetween;
                            xPos = xBase;
                            rightMarginReached = true;
                        }


                        rowCommands.push({
                            op: "text",
                            params: [xPos, yPos + pdfConst.axisInfoFontHeight + pdfConst.smallBoxMargin, "•"]
                        });
                        //This is commented out because we have decided for the time being, we will use text to display the icon until we find a way to display higher resolution ones
                        //rowCommands.push({
                        //    op: "addImage",
                        //    params: [getJpegIcon(axisIcon.content, axisIcon.fontFamily, pdfConst.iconFont, pdfConst.iconWidth, pdfConst.iconHeight), "jpeg", xPos + pdfConst.axisIconHmargin, yPos + additionalVIconMargin]
                        //});
                        rowCommands.push({
                            op: "text",
                            params: [xPos + pdfConst.axisIconHmargin, yPos + pdfConst.axisInfoFontHeight + pdfConst.smallBoxMargin, "X" + (i + 1)]
                        });

                        rowCommands.push({
                            op: "setTextColor",
                            params: [pdfConst.filterCardColor.R, pdfConst.filterCardColor.G, pdfConst.filterCardColor.B]
                        });

                        rowCommands.push({
                            op: "setDrawColor",
                            params: [pdfConst.filterCardColor.R, pdfConst.filterCardColor.G, pdfConst.filterCardColor.B]
                        });

                        rowCommands.push({
                            op: "rect",
                            params: [xPos + (2 * pdfConst.axisIconHmargin) + pdfConst.iconWidth, yPos, attributeLength + (2 * pdfConst.smallBoxMargin), (2 * pdfConst.smallBoxMargin) + pdfConst.axisInfoFontHeight]
                        });
                        rowCommands.push({
                            op: "text",
                            params: [xPos + (2 * pdfConst.axisIconHmargin) + pdfConst.iconWidth + pdfConst.smallBoxMargin, yPos + pdfConst.axisInfoFontHeight + pdfConst.smallBoxMargin, attributeLongName]
                        });

                        rowCommands.push({
                            op: "setTextColor",
                            params: [0, 0, 0]
                        });

                        rowCommands.push({
                            op: "setDrawColor",
                            params: [0, 0, 0]
                        });

                        xPos += totalLength + pdfConst.axisInfoMarginBetween;


                        colArray.push({
                            name: (chartType === "boxplot" ? "X" + (i + 1) : attributeName),
                            key: axisAttributes[i].selection,
                            isMeasure: axisAttributes[i].isMeasure,
                            icon: axisIcon
                        });
                    }
                }

                xPos += pdfConst.axisInfoMarginBetweenCat;

                //Y-Axis and stacked
                for (i = 3; i < 5; i++) {
                    axisIconURI = axisAttributesIcon.attr[i].icon;
                    axisIcon = sap.ui.core.IconPool.getIconInfo(axisIconURI);

                    if (axisAttributes[i].selection && axisAttributes[i].selection !== "n/a") {
                        attributeObj = configInfo.getAttributeByPath(axisAttributes[i].selection)._oInternalConfigAttribute;
                        attributeName = attributeObj.name;

                        validFilterCards = bookmark.cards.content[0].content;
                        parentFilterCardName = "";

                        for (ii = 0; ii < validFilterCards.length; ii++) {
                            if (axisAttributes[i].selection.indexOf(validFilterCards[ii].instanceID) > -1) {
                                parentFilterCardName = validFilterCards[ii].name;
                            }
                        }

                        attributeLongName = parentFilterCardName + " > " + attributeName;
                        attributeLength = pdf.getStringUnitWidth(attributeLongName) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;

                        totalLength = (2 * pdfConst.axisIconHmargin) + pdfConst.iconWidth + (2 * pdfConst.smallBoxMargin) + attributeLength;

                        if (totalLength + xPos > axisInfoMaxWidth) {
                            yPos += (pdfConst.smallBoxMargin * 2) + pdfConst.axisInfoFontHeight + pdfConst.axisInfoMarginBetween;
                            xPos = xBase;
                            rightMarginReached = true;
                        }

                        rowCommands.push({
                            op: "text",
                            params: [xPos, yPos + pdfConst.axisInfoFontHeight + pdfConst.smallBoxMargin, "•"]
                        });
                        if (i === 3) { //Only for Stacked Bar Icon
                            rowCommands.push({
                                op: "addImage",
                                params: [getJpegIcon(axisIcon.content, axisIcon.fontFamily, pdfConst.iconFont, pdfConst.iconWidth, pdfConst.iconHeight), "jpeg", xPos + pdfConst.axisIconHmargin, yPos + additionalVIconMargin]
                            });
                        } else {
                            rowCommands.push({
                                op: "text",
                                params: [xPos + pdfConst.axisIconHmargin, yPos + pdfConst.axisInfoFontHeight + pdfConst.smallBoxMargin, "Y"]
                            });
                        }

                        rowCommands.push({
                            op: "setTextColor",
                            params: [pdfConst.filterCardColor.R, pdfConst.filterCardColor.G, pdfConst.filterCardColor.B]
                        });

                        rowCommands.push({
                            op: "setDrawColor",
                            params: [pdfConst.filterCardColor.R, pdfConst.filterCardColor.G, pdfConst.filterCardColor.B]
                        });

                        rowCommands.push({
                            op: "rect",
                            params: [xPos + (2 * pdfConst.axisIconHmargin) + pdfConst.iconWidth, yPos, attributeLength + (2 * pdfConst.smallBoxMargin), (2 * pdfConst.smallBoxMargin) + pdfConst.axisInfoFontHeight]
                        });
                        rowCommands.push({
                            op: "text",
                            params: [xPos + (2 * pdfConst.axisIconHmargin) + pdfConst.iconWidth + pdfConst.smallBoxMargin, yPos + pdfConst.axisInfoFontHeight + pdfConst.smallBoxMargin, attributeLongName]
                        });

                        rowCommands.push({
                            op: "setTextColor",
                            params: [0, 0, 0]
                        });

                        rowCommands.push({
                            op: "setDrawColor",
                            params: [0, 0, 0]
                        });

                        xPos += totalLength + pdfConst.axisInfoMarginBetween;
                        colArray.push({
                            name: attributeName,
                            key: axisAttributes[i].selection,
                            isMeasure: axisAttributes[i].isMeasure,
                            icon: axisIcon
                        });
                    }


                }

                if (chartType === "km") {
                    rightMarginReached = true;

                    yPos += (pdfConst.smallBoxMargin * 2) + pdfConst.axisInfoFontHeight + pdfConst.axisInfoMarginBetween;
                    xPos = xBase;

                    var startDateString = "• " + Utils.getText("MRI_PA_KAPLAN_START_EVENT");
                    var endDateString = "• " + Utils.getText("MRI_PA_KAPLAN_END_EVENT");
                    var startEventName = chartObj.getModel().getData().selected_event_label;
                    var endEventName = chartObj.getModel().getData().selected_end_event_label;

                    var labelLength = pdf.getStringUnitWidth(startDateString) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
                    attributeLength = pdf.getStringUnitWidth(startEventName) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
                    totalLength = labelLength + (3 * pdfConst.smallBoxMargin) + attributeLength;

                    if (totalLength + xPos > axisInfoMaxWidth) {
                        yPos += (pdfConst.smallBoxMargin * 2) + pdfConst.axisInfoFontHeight + pdfConst.axisInfoMarginBetween;
                        xPos = xBase;
                        rightMarginReached = true;
                    }

                    rowCommands.push({
                        op: "text",
                        params: [xPos, yPos + pdfConst.axisInfoFontHeight + pdfConst.smallBoxMargin, startDateString]
                    });

                    rowCommands.push({
                        op: "setTextColor",
                        params: [pdfConst.filterCardColor.R, pdfConst.filterCardColor.G, pdfConst.filterCardColor.B]
                    });

                    rowCommands.push({
                        op: "setDrawColor",
                        params: [pdfConst.filterCardColor.R, pdfConst.filterCardColor.G, pdfConst.filterCardColor.B]
                    });

                    rowCommands.push({
                        op: "rect",
                        params: [xPos + labelLength + pdfConst.smallBoxMargin, yPos, attributeLength + (2 * pdfConst.smallBoxMargin), (2 * pdfConst.smallBoxMargin) + pdfConst.axisInfoFontHeight]
                    });
                    rowCommands.push({
                        op: "text",
                        params: [xPos + labelLength + (pdfConst.smallBoxMargin * 2), yPos + pdfConst.axisInfoFontHeight + pdfConst.smallBoxMargin, startEventName]
                    });

                    rowCommands.push({
                        op: "setTextColor",
                        params: [0, 0, 0]
                    });

                    rowCommands.push({
                        op: "setDrawColor",
                        params: [0, 0, 0]
                    });

                    xPos += totalLength + pdfConst.axisInfoMarginBetweenCat;

                    labelLength = pdf.getStringUnitWidth(endDateString) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
                    attributeLength = pdf.getStringUnitWidth(endEventName) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
                    totalLength = labelLength + (3 * pdfConst.smallBoxMargin) + attributeLength;

                    if (totalLength + xPos > axisInfoMaxWidth) {
                        yPos += (pdfConst.smallBoxMargin * 2) + pdfConst.axisInfoFontHeight + pdfConst.axisInfoMarginBetween;
                        xPos = xBase;
                        rightMarginReached = true;
                    }

                    rowCommands.push({
                        op: "text",
                        params: [xPos, yPos + pdfConst.axisInfoFontHeight + pdfConst.smallBoxMargin, endDateString]
                    });

                    rowCommands.push({
                        op: "setTextColor",
                        params: [pdfConst.filterCardColor.R, pdfConst.filterCardColor.G, pdfConst.filterCardColor.B]
                    });

                    rowCommands.push({
                        op: "setDrawColor",
                        params: [pdfConst.filterCardColor.R, pdfConst.filterCardColor.G, pdfConst.filterCardColor.B]
                    });

                    rowCommands.push({
                        op: "rect",
                        params: [xPos + labelLength + pdfConst.smallBoxMargin, yPos, attributeLength + (2 * pdfConst.smallBoxMargin), (2 * pdfConst.smallBoxMargin) + pdfConst.axisInfoFontHeight]
                    });
                    rowCommands.push({
                        op: "text",
                        params: [xPos + labelLength + (pdfConst.smallBoxMargin * 2), yPos + pdfConst.axisInfoFontHeight + pdfConst.smallBoxMargin, endEventName]
                    });

                    rowCommands.push({
                        op: "setTextColor",
                        params: [0, 0, 0]
                    });

                    rowCommands.push({
                        op: "setDrawColor",
                        params: [0, 0, 0]
                    });
                }

                yPos += (pdfConst.smallBoxMargin * 2) + pdfConst.axisInfoFontHeight + pdfConst.axisInfoMarginBetween;

                rowCommands.push({
                    op: "rect",
                    params: [pdfConst.pageLeftMargin, yStart, (rightMarginReached ? pdfConst.pageWidth - pdfConst.pageRightMargin : xPos) - pdfConst.pageLeftMargin, yPos - yStart]
                });

                if (yPos > pdfConst.pageHeight - pdfConst.pageBottomMargin) {
                    pdfCommands.push({ commands: pageCommands });
                    for (i = 0; i < rowCommands.length; i++) {
                        var cmd = rowCommands[i];
                        if (cmd.op === "addImage") {
                            cmd.params[3] -= yOffset;
                        }
                        if (cmd.op === "rect" || cmd.op === "text") {
                            cmd.params[1] -= yOffset;
                        }
                        if (cmd.op === "line") {
                            cmd.params[1] -= yOffset;
                            cmd.params[3] -= yOffset;
                        }
                    }
                    pageCommands = [];
                    pageCommands = printChartTitle(pageCommands);
                    yPos -= yOffset;
                }

                for (i = 0; i < rowCommands.length; i++) {
                    pageCommands.push(rowCommands[i]);

                }
                rowCommands = [];

                yStart = yPos + pdfConst.sectionFooterBottomMargin;

                //Part 3: Details Table Headers
                if (chartType === "boxplot") {
                    yOffset = yStart - pdfConst.pageTopMargin;
                    colArray.pop();
                    var columnNo = colArray.length + 6;
                    var cellWidthWMargin = (pdfConst.pageWidth - pdfConst.pageLeftMargin - pdfConst.pageRightMargin) / columnNo;
                    var cellWidth = cellWidthWMargin - (pdfConst.tableMargin * 2);


                    rowCommands.push({
                        op: "setFontSize",
                        params: [pdfConst.tableFont]
                    });
                    rowCommands.push({
                        op: "setTextColor",
                        params: [pdfConst.filterCardHeaderFontColor.R, pdfConst.filterCardHeaderFontColor.G, pdfConst.filterCardHeaderFontColor.B]
                    });
                    pdf.setFontSize(pdfConst.tableFont);

                    var halfHeaderHeight = (pdfConst.tableMargin * 2 + pdfConst.tableFontHeight);
                    var fullHeaderHeight = halfHeaderHeight * 2;

                    for (i = 0; i < colArray.length; i++) {
                        var cellIcon = colArray[i].icon;
                        rowCommands.push({
                            op: "text",
                            params: [pdfConst.pageLeftMargin + (i * cellWidthWMargin) + pdfConst.tableMargin, yStart + (fullHeaderHeight + pdfConst.tableFontHeight) / 2, colArray[i].name]
                        });
                        //This is commented out because we have decided for the time being, we will use text to display the icon until we find a way to display higher resolution ones
                        //rowCommands.push({
                        //    op: "addImage",
                        //    params: [getJpegIcon(cellIcon.content, cellIcon.fontFamily, pdfConst.iconFont, pdfConst.iconWidth, pdfConst.iconHeight, pdfConst.tableColor.HEX), "jpeg", pdfConst.pageLeftMargin + (i * cellWidthWMargin) + pdfConst.tableMargin, yStart + (fullHeaderHeight - //pdfConst.iconHeight) / 2]
                        //});
                    }

                    var measureBaseX = pdfConst.pageLeftMargin + (colArray.length * cellWidthWMargin);

                    var boxPlotValues = ["MRI_PA_MIN_VAL", "MRI_PA_Q1", "MRI_PA_MEDIAN", "MRI_PA_Q3", "MRI_PA_MAX_VAL", "MRI_PA_DOWNLOAD_PDF_TEXT_COUNT"];
                    for (i = 0; i < boxPlotValues.length; i++) {
                        var measureText = Utils.getText(boxPlotValues[i]);
                        rowCommands.push({
                            op: "text",
                            params: [measureBaseX + (i * cellWidthWMargin) + pdfConst.tableMargin, yStart + halfHeaderHeight + pdfConst.tableFontHeight + pdfConst.tableMargin, measureText]
                        });
                    }

                    var yText = Utils.getText("MRI_PA_DOWNLOAD_PDF_Y_VALUES");
                    var yTextLength = pdf.getStringUnitWidth(measureText) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
                    rowCommands.push({
                        op: "text",
                        params: [measureBaseX + (((cellWidthWMargin * 6) - yTextLength) / 2), yStart + pdfConst.tableFontHeight + pdfConst.tableMargin, yText]
                    });

                    rowCommands.unshift({
                        op: "rectFill",
                        params: [pdfConst.pageLeftMargin, yStart, (pdfConst.pageWidth - pdfConst.pageLeftMargin - pdfConst.pageRightMargin), fullHeaderHeight]
                    });

                    rowCommands.unshift({
                        op: "setFillColor",
                        params: [pdfConst.tableColor.R, pdfConst.tableColor.G, pdfConst.tableColor.B]
                    });

                    rowCommands.push({
                        op: "setDrawColor",
                        params: [pdfConst.boxplotHeaderBorderColor.R, pdfConst.boxplotHeaderBorderColor.G, pdfConst.boxplotHeaderBorderColor.B]
                    });

                    rowCommands.push({
                        op: "setTextColor",
                        params: [0, 0, 0]
                    });

                    rowCommands.push({
                        op: "rect",
                        params: [pdfConst.pageLeftMargin, yStart, (measureBaseX - pdfConst.pageLeftMargin), fullHeaderHeight]
                    });

                    rowCommands.push({
                        op: "rect",
                        params: [measureBaseX, yStart, (cellWidthWMargin * 6), halfHeaderHeight]
                    });

                    rowCommands.push({
                        op: "rect",
                        params: [measureBaseX, yStart + halfHeaderHeight, (cellWidthWMargin * 6), halfHeaderHeight]
                    });

                    yStart += fullHeaderHeight;


                } else {
                    yOffset = yStart - pdfConst.pageTopMargin;
                    if (chartType === "km") {
                        colArray.pop();
                        colArray.push({
                            name: Utils.getText("MRI_PA_DOWNLOAD_PDF_TEXT_PATIENT_COUNT"),
                            key: "pcount",
                            isMeasure: true
                        });
                    }

                    cellWidthWMargin = (pdfConst.pageWidth - pdfConst.pageLeftMargin - pdfConst.pageRightMargin) / (colArray.length);
                    cellWidth = cellWidthWMargin - (pdfConst.tableMargin * 2);
                    var rowHeight = pdfConst.tableFontHeight + (pdfConst.tableMargin * 2);

                    rowCommands.push({
                        op: "setFontSize",
                        params: [pdfConst.tableFont]
                    });
                    rowCommands.push({
                        op: "setTextColor",
                        params: [pdfConst.filterCardHeaderFontColor.R, pdfConst.filterCardHeaderFontColor.G, pdfConst.filterCardHeaderFontColor.B]
                    });
                    pdf.setFontSize(pdfConst.tableFont);

                    for (i = 0; i < colArray.length; i++) {
                        var cellText = colArray[i].name;
                        var splitText = pdf.splitTextToSize(cellText, cellWidth);
                        var cellHeight = (pdfConst.tableMargin * 2) + ((pdfConst.tableFontHeight + 1) * splitText.length) - 1;

                        rowCommands.push({
                            op: "text",
                            params: [pdfConst.pageLeftMargin + (i * cellWidthWMargin) + pdfConst.tableMargin, yStart + pdfConst.tableFontHeight + pdfConst.tableMargin, splitText]
                        });

                        if (cellHeight > rowHeight) {
                            rowHeight = cellHeight;
                        }
                    }

                    rowCommands.unshift({
                        op: "rectFill",
                        params: [pdfConst.pageLeftMargin, yStart, (pdfConst.pageWidth - pdfConst.pageLeftMargin - pdfConst.pageRightMargin), rowHeight]
                    });

                    rowCommands.unshift({
                        op: "setFillColor",
                        params: [pdfConst.tableColor.R, pdfConst.tableColor.G, pdfConst.tableColor.B]
                    });

                    rowCommands.push({
                        op: "setDrawColor",
                        params: [pdfConst.plHeaderColor.R, pdfConst.plHeaderColor.G, pdfConst.plHeaderColor.B]
                    });
                    rowCommands.push({
                        op: "setTextColor",
                        params: [0, 0, 0]
                    });

                    yStart += rowHeight;
                }

                if (yStart > pdfConst.pageHeight - pdfConst.pageBottomMargin) {
                    pdfCommands.push({ commands: pageCommands });
                    for (i = 0; i < rowCommands.length; i++) {
                        cmd = rowCommands[i];
                        if (cmd.op === "addImage") {
                            cmd.params[3] -= yOffset;
                        }
                        if (cmd.op === "rect" || cmd.op === "rectFill" || cmd.op === "text") {
                            cmd.params[1] -= yOffset;
                        }
                    }
                    pageCommands = [];
                    pageCommands = printChartTitle(pageCommands);
                    yStart -= yOffset;
                }

                for (i = 0; i < rowCommands.length; i++) {
                    pageCommands.push(rowCommands[i]);
                }
                rowCommands = [];

                //Part 4: Details Table
                var chartData;
                var cellData;
                columnNo = 0;
                var formattedData = [];

                //Pre-Format Data for different Charts
                if (chartType === "boxplot") {
                    chartData = chartObj.getData();
                    for (i = 0; i < chartData.length; i++) {
                        var formattedRowData = [];
                        for (ii = 0; ii < colArray.length; ii++) {
                            cellData = chartData[i][colArray[ii].key];
                            if (cellData) {
                                formattedRowData.push(cellData.toString());
                            } else if (cellData === 0) {
                                formattedRowData.push("0");
                            } else {
                                formattedRowData.push("NoValue");
                            }
                        }
                        for (iii = 0; iii < 5; iii++) {
                            cellData = chartData[i].values[iii];
                            if (cellData) {
                                formattedRowData.push(cellData.toString());
                            } else if (cellData === 0) {
                                formattedRowData.push("0");
                            } else {
                                formattedRowData.push("NoValue");
                            }
                        }
                        formattedRowData.push(chartData[i].NUM_ENTRIES.toString());
                        formattedData.push(formattedRowData);
                    }
                    columnNo = colArray.length + 6;
                } else {
                    if (chartType === "km") {
                        chartData = chartObj.getProperty("series");
                    } else {
                        chartData = chartObj.getDataset().getModel().getData().data;
                    }

                    for (i = 0; i < chartData.length; i++) {
                        formattedRowData = [];
                        for (ii = 0; ii < colArray.length; ii++) {
                            cellData = chartData[i][colArray[ii].key];
                            if (cellData) {
                                formattedRowData.push(cellData.toString());
                            } else if (cellData === 0) {
                                formattedRowData.push("0");
                            } else {
                                formattedRowData.push("");
                            }

                        }
                        formattedData.push(formattedRowData);
                    }
                    columnNo = colArray.length;
                }

                var dataCommands = generatePdfDataTable(yStart, pageCommands, columnNo, formattedData);
                if (dataCommands.length > 0) {
                    for (i = 0; i < dataCommands.length - 1; i++) {
                        pdfCommands.push(dataCommands[i]);
                    }
                    pageCommands = dataCommands[dataCommands.length - 1].commands;
                }

            }

            if (pageCommands.length > 0) {
                pdfCommands.push({ commands: pageCommands });
                pageCommands = [];
            }

            return pdfCommands;

        };

        /**
         * This Method generates whole PDF for Patient List. First, it will load the busy indicator, then invokes the Download CSV service from backend to get
         * all the data for the patient list, parses it using the d3 csv(dsv) library, and generates the Patient List Table using the generatePdfDataTable
         * method above. Then it will call the printPdfToFile to generate the PDF for the user. It will then unload the busy indicator.
         *
         * @param   N/A
         * @returns N/A
         */
        var generatePdfPatientList = function () {
            paController.getView().setBusyIndicatorDelay(0);
            paController.getView().setBusy(true);

            var columnNo = chartWrapper.getAggregation("_table").getAggregation("columns").length;
            var csvUrl = chartWrapper._getDownloadLink();
            var downloadData = chartWrapper._getDownloadData();
            var additionalParameter = chartWrapper._getDownloadParameter();
            var pdfCommands = [];

            if (additionalParameter) {
                for (var key in additionalParameter) {
                    if (additionalParameter.hasOwnProperty(key)) {
                        downloadData[key] = additionalParameter[key];
                    }
                }
            }

            var request = {
                type: "POST",
                url: csvUrl,
                data: JSON.stringify(MriFrontendConfig.getFrontendConfig().reverseTranslate(downloadData)),
                contentType: "application/json;charset=utf-8"
            };



            Utils.ajax(request).done(jQuery.proxy(function (aData) {
                var dsv = d3.dsv(";", "text/plain");
                var csvData = dsv.parseRows(aData);
                var yStart = pdfConst.pageTopMargin;
                var pageCommands = [];

                var cellWidthWMargin = (pdfConst.pageWidth - pdfConst.pageLeftMargin - pdfConst.pageRightMargin) / columnNo;
                var cellWidth = cellWidthWMargin - 2 * (pdfConst.tableMargin);

                var rowHeight = pdfConst.tableFontHeight + pdfConst.tableMargin * 2;

                pageCommands = printChartTitle(pageCommands);

                pageCommands.push({
                    op: "setFontSize",
                    params: [pdfConst.tableFont]
                });
                pdf.setFontSize(pdfConst.tableFont);

                for (var i = 0; i < columnNo; i++) {
                    var cellText = csvData[0][i];
                    var splitText = pdf.splitTextToSize(cellText, cellWidth);
                    var cellHeight = pdfConst.tableMargin * 2 + ((pdfConst.tableFontHeight + 1) * splitText.length) - 1;

                    pageCommands.push({
                        op: "text",
                        params: [pdfConst.pageLeftMargin + (i * cellWidthWMargin) + pdfConst.tableMargin, yStart + pdfConst.tableFontHeight + pdfConst.tableMargin, splitText]
                    });

                    if (cellHeight > rowHeight) {
                        rowHeight = cellHeight;
                    }
                }

                pageCommands.unshift({
                    op: "rectFill",
                    params: [pdfConst.pageLeftMargin, yStart, (pdfConst.pageWidth - pdfConst.pageLeftMargin - pdfConst.pageRightMargin), rowHeight]
                });

                pageCommands.unshift({
                    op: "setFillColor",
                    params: [pdfConst.plHeaderColor.R, pdfConst.plHeaderColor.G, pdfConst.plHeaderColor.B]
                });

                pageCommands.push({
                    op: "setDrawColor",
                    params: [pdfConst.plHeaderColor.R, pdfConst.plHeaderColor.G, pdfConst.plHeaderColor.B]
                });

                yStart += rowHeight;
                csvData.shift();

                var generatedCommand = generatePdfDataTable(yStart, pageCommands, columnNo, csvData);

                for (i = 0; i < generatedCommand.length; i++) {
                    pdfCommands.push(generatedCommand[i]);
                }

                if (pdfParam.includeFiltercard) {
                    var filterCardsCommand = generatePdfFilterDetails();
                    for (i = 0; i < filterCardsCommand.length; i++) {
                        pdfCommands.push(filterCardsCommand[i]);
                    }
                }

                printPdfToFile(pdfCommands);
                paController.getView().setBusy(false);

            }, this));

        };

        /**
         * This Method generates commands to print the chart. It takes the chart from the global variable Chartobj within the generatePDF method.
         * First, the SVG element in the PA page will be cloned. Then, the stylesheet information will be copied and applied to this cloned SVG Object.
         * In the next step, the SVG will be converted to Image, which in turn will be drawn unto a canvas. The canvas will be flattened to JPEG and we will generate
         * PDF Commands to attach this JPEG unto the pdf file itself.
         *
         * For KM, additional steps is required to manually generate the Legends. Only legends within the page limitation will be displayed as per the design decision.
         *
         *
         * @param   N/A
         * @returns {Object} A single "Page" of PDFCommands
         */
        var generatePdfCharts = function () {

            var pdfChartCommands = [];

            var duplicateStyle = function (element, style) {
                element.style.fill = style.fill;
                if (style.fill === "rgba(0,0,0,0)") {
                    element.style.fill = "transparent";
                }
                element.style.stroke = style.stroke;
                element.style.strokeStyle = style.strokeStyle;
                element.style.display = style.display;
                element.style["stroke-width"] = style["stroke-width"] ? "1px" : "";
                element.style["font-size"] = style["font-size"];
                element.style["fill-opacity"] = style["fill-opacity"];
                element.style["stroke-opacity"] = style["stroke-opacity"];
                element.style["font-weight"] = "";

                if (chartType === "km") {
                    var colorString;
                    for (var col = 0; col < colorConstOpacity.length; col++) {
                        colorString = "rgb(" + colorConstOpacity[col].originR + ", " + colorConstOpacity[col].originG + ", " + colorConstOpacity[col].originB + ")";
                        if (style.stroke === colorString && style.opacity && style.opacity < 1) {
                            element.style.stroke = "rgb(" + colorConstOpacity[col].newR + ", " + colorConstOpacity[col].newG + ", " + colorConstOpacity[col].newB + ")";
                        }
                    }
                }
            };

            var svgApplyCSS = function (svgOrigin, svgElement) {

                if (svgElement.childNodes && svgElement.childNodes.length > 0) {
                    for (var i = 0; i < svgElement.childNodes.length; i++) {
                        if (svgElement.nodeType === 1) {
                            svgApplyCSS(svgOrigin.childNodes[i], svgElement.childNodes[i]);
                        }
                    }
                }
                if (svgElement.nodeType === 1) {
                    duplicateStyle(svgElement, window.getComputedStyle(svgOrigin));
                }
            };

            if (patientCount > 0) {
                var svgItem = d3.select(chartObj.getDomRef()).select("svg")[0][0];
                var svgClone = svgItem.cloneNode(true);
                var serializer = new XMLSerializer();

                if (chartType === "km") {
                    svgClone.setAttribute("class", "sapMriPaKaplan");
                    svgApplyCSS(svgItem, svgClone);
                    svgClone.childNodes[0].style.fill = "#ffffff";
                } else if (chartType === "stacked") {
                    svgClone.childNodes[1].childNodes[0].style.fill = "#ffffff";
                } else if (chartType === "boxplot") {
                    svgApplyCSS(svgItem, svgClone);
                    svgClone.childNodes[0].style.fill = "#ffffff";
                }

                var pdfCanvas = document.createElement("canvas");
                pdfCanvas.height = targetHeight;
                if (chartType === "km") {
                    pdfCanvas.width = targetWidth + (pdfConst.kmLegendWidth * mm);
                } else {
                    pdfCanvas.width = targetWidth;
                }

                var svgStr = serializer.serializeToString(svgClone);

                //Manually Move X-Axis Legends for KM
                if (chartType === "km") {
                    var xAxisLocation = "translate(" + Math.floor(targetWidth);
                    var xAxisNewLocation = "translate(" + (Math.floor(targetWidth) - pdfConst.kmLegendWidth);
                    svgStr = svgStr.replace(xAxisLocation, xAxisNewLocation);
                }
                window.canvg(pdfCanvas, svgStr);

                var imgData = pdfCanvas.toDataURL("image/jpeg");

                pdfChartCommands.push({
                    op: "addImage",
                    params: [imgData, "jpeg", pdfConst.pageLeftMargin, pdfConst.pageTopMargin]
                });

                pdfChartCommands.push({
                    op: "rect",
                    params: [pdfConst.pageLeftMargin - 1, pdfConst.pageTopMargin - 1, (pdfConst.pageWidth - pdfConst.pageLeftMargin - pdfConst.pageRightMargin) + 1, (pdfConst.pageHeight - pdfConst.pageTopMargin - pdfConst.pageBottomMargin) + 1]
                });


                if (chartType === "km") {
                    var pdfCanvasLegend = document.createElement("canvas");
                    pdfCanvasLegend.height = targetHeight;
                    pdfCanvasLegend.width = pdfConst.kmLegendWidth * mm;
                    pdfCanvasLegend.getContext("2d").fillStyle = "#ffffff";
                    pdfCanvasLegend.getContext("2d").fillRect(0, 0, pdfConst.kmLegendWidth * mm, targetHeight);

                    //Manually Draw Legends for KM
                    var kmLegendObj = chartObj.getParent().getAggregation("items")[1];
                    var kmLegendData = chartObj.getModel().getData().series;
                    var kmLegendTitle = chartObj.getModel().getData().legendTitle;

                    var baseY = pdfConst.kmLegendMargin;

                    pdfCanvasLegend.getContext("2d").fillStyle = pdfConst.kmLegendColor;
                    pdfCanvasLegend.getContext("2d").font = pdfConst.kmLegendFont;
                    pdfCanvasLegend.getContext("2d").fillText(Utils.getText("MRI_PA_KAPLAN_LOG_RANK"), 0, baseY + pdfConst.kmLegendBox);

                    baseY += pdfConst.kmLegendBox + pdfConst.kmLegendMargin;
                    var pValue = Utils.getText("MRI_PA_KAPLAN_LOG_RANK_P") + " " + chartObj.getModel().getData().kaplanMeierStatistics.overallResult.pValue;
                    pdfCanvasLegend.getContext("2d").fillText(pValue, 0, baseY + pdfConst.kmLegendBox);

                    baseY += pdfConst.kmLegendBox + pdfConst.kmLegendMargin;

                    pdfCanvasLegend.getContext("2d").fillStyle = pdfConst.kmLegendColor;
                    pdfCanvasLegend.getContext("2d").font = "bold " + pdfConst.kmLegendFont;

                    var wrappedText = canvasWrapper(pdfCanvasLegend.getContext("2d"), kmLegendTitle, (pdfConst.kmLegendWidth * mm) - (pdfConst.kmLegendBox + pdfConst.kmLegendMargin));

                    for (var i = 0; i < wrappedText.length; i++) {
                        if (i > 0) {
                            baseY += pdfConst.kmLegendBox;
                        }
                        pdfCanvasLegend.getContext("2d").fillText(wrappedText[i], 0, baseY + pdfConst.kmLegendBox);
                    }
                    pdfCanvasLegend.getContext("2d").font = pdfConst.kmLegendFont;

                    for (i = 0; i < kmLegendData.length; i++) {
                        var legendData = kmLegendData[i];
                        var legendText = legendData.name;
                        var legendColor = legendData._color;

                        baseY += pdfConst.kmLegendBox + pdfConst.kmLegendMargin;
                        wrappedText = canvasWrapper(pdfCanvasLegend.getContext("2d"), legendText, (pdfConst.kmLegendWidth * mm) - (pdfConst.kmLegendBox + pdfConst.kmLegendMargin));

                        if ((baseY + (wrappedText.length * pdfConst.kmLegendBox)) > targetHeight) {
                            break;
                        } else {
                            pdfCanvasLegend.getContext("2d").fillStyle = legendColor;
                            pdfCanvasLegend.getContext("2d").fillRect(0, baseY, pdfConst.kmLegendBox, pdfConst.kmLegendBox);
                            pdfCanvasLegend.getContext("2d").fillStyle = pdfConst.kmLegendColor;
                            pdfCanvasLegend.getContext("2d").font = pdfConst.kmLegendFont;

                            for (var ii = 0; ii < wrappedText.length; ii++) {
                                if (ii > 0) {
                                    baseY += pdfConst.kmLegendBox;
                                }
                                pdfCanvasLegend.getContext("2d").fillText(wrappedText[ii], pdfConst.kmLegendBox + pdfConst.kmLegendMargin, baseY + pdfConst.kmLegendBox - pdfConst.kmLegendTextMargin);
                            }
                        }
                    }

                    var legendImage = pdfCanvasLegend.toDataURL("image/jpeg");

                    pdfChartCommands.push({
                        op: "addImage",
                        params: [legendImage, "jpeg", pdfConst.pageWidth - pdfConst.pageRightMargin - pdfConst.kmLegendWidth, pdfConst.pageTopMargin]
                    });

                }

                pdfChartCommands = printChartTitle(pdfChartCommands);

            } else {

                pdfChartCommands.push({
                    op: "setFontSize",
                    params: [pdfConst.chartFont]
                });

                pdf.setFontSize(pdfConst.chartFont);

                var noMatchingText = Utils.getText("MRI_PA_NO_MATCHING_PATIENTS");
                var noMatchingLength = pdf.getStringUnitWidth(noMatchingText) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
                var centerXOffset = (pdfConst.pageWidth - pdfConst.pageLeftMargin - pdfConst.pageRightMargin - noMatchingLength) / 2;
                var centerYOffset = (pdfConst.pageHeight - pdfConst.pageTopMargin - pdfConst.pageBottomMargin - pdfConst.chartFontHeight) / 2;

                pdfChartCommands.push({
                    op: "text",
                    params: [pdfConst.pageLeftMargin + centerXOffset, pdfConst.pageTopMargin + centerYOffset, noMatchingText]
                });

                pdfChartCommands.push({
                    op: "rect",
                    params: [pdfConst.pageLeftMargin - 1, pdfConst.pageTopMargin - 1, (pdfConst.pageWidth - pdfConst.pageLeftMargin - pdfConst.pageRightMargin) + 1, (pdfConst.pageHeight - pdfConst.pageTopMargin - pdfConst.pageBottomMargin) + 1]
                });

                pdfChartCommands = printChartTitle(pdfChartCommands);
            }

            return { commands: pdfChartCommands };
        };

        /**
         * This Method generates whole PDF for Non Patient List Charts. It will be invoked after the charts has been resized, generate the Chart by generatePdfCharts
         * method, then generate the filtercards/details pdf if required, and then it will call the printPdfToFile to generate the PDF for the user. Finally it will
         * resize the charts to its original size before unloading the busyIndicator
         *
         * @param   N/A
         * @returns N/A
         */
        var generatePdfCommands = function () {
            var pdfInstruction = [];

            var pdfChart = generatePdfCharts();
            pdfInstruction.push(pdfChart);

            if (pdfParam.includeFiltercard || pdfParam.includeDetails) {
                var pdfFilterDetails = generatePdfFilterDetails();
                for (var i = 0; i < pdfFilterDetails.length; i++) {
                    pdfInstruction.push(pdfFilterDetails[i]);
                }
            }

            printPdfToFile(pdfInstruction);
            chartResize(chartObj, originalHeight, originalWidth, false);
        };

        if (chartType === "list") {
            generatePdfPatientList();
        } else {
            if (chartType === "km") {
                chartObj = chartWrapper.getAggregation("layout").getAggregation("items")[0].getAggregation("items")[0];
                originalHeight = chartObj.getYpoints();
                originalWidth = chartObj.getXpoints();
                targetWidth -= pdfConst.kmLegendWidth * mm;
                chartResize(chartObj, targetHeight, targetWidth, true);
            } else {
                chartResize(chartObj, targetHeight + "px", targetWidth + "px", true);
            }
            setTimeout(generatePdfCommands, 600);
        }

    };

    return PdfExport;
});
