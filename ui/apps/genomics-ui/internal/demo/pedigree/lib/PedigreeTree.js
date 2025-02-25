jQuery.sap.declare("hc.hph.genomics.internal.demo.pedigree.lib.PedigreeTree");
jQuery.sap.includeStyleSheet("/hc/hph/genomics/internal/demo/pedigree/lib/PedigreeTree.css", "hc.hph.genomics.internal.demo.pedigree.lib.PedigreeTree.css");
sap.ui.core.Control.extend("hc.hph.genomics.internal.demo.pedigree.lib.PedigreeTree", {
    metadata: {
        properties: {
            data: {
                type: "object",
                defaultValue: {}
            }
        }
    },
    renderer: {
        render: function (oRenderManager, oControl) {
            oRenderManager.write("<div");
            oRenderManager.writeControlData(oControl);
            oRenderManager.addClass("sapHcHphInternalPedigree");
            oRenderManager.writeClasses();
            oRenderManager.write("/>");
        }
    },
    init: function () {
        this.mPedigreeMargin = {
            top: 64,
            left: 64,
            bottom: 64,
            right: 64
        };
    },
    onAfterRendering: function () {
        var oThis = this;
        var sControlID = this.getId();
        var oControl = d3.select("#" + sControlID);
        var iWidth = this.$().innerWidth() - this.mPedigreeMargin.left - this.mPedigreeMargin.right;
        var iHeight = this.$().innerHeight() - this.mPedigreeMargin.top - this.mPedigreeMargin.bottom;
        var oTree = d3.layout.tree().separation(function (first, second) {
            return first.parent === second.parent ? 1.0 : 0.5;
        }).children(function (oNode) {
            return oNode.parents;
        }).size([
            iWidth,
            iHeight
        ]);
        /*
		var contextmenuPopup = oControl.append( "div" )
			.attr( "id", sControlID + "-contextmenu" )
			.attr( "class", "popup" );
		var contextmenu = contextmenuPopup.append( "ul" )
			.attr( "class", "menu" );
		contextmenu.append( "li" ).append( "a" ).text( "Show patient file" );
		contextmenu.append( "li" ).append( "a" ).text( "Show in variant browser" );
		contextmenu.selectAll( "li" )
			.on( "click",
				function ()
				{
					contextmenuPopup.transition()
						.duration( 500 )
						.style( "opacity", 0.0 )
						.each( "end", function () { contextmenuPopup.style( "display", "none" ); } );
				}
			);

		var menuPopup = oControl.append( "div" )
			.attr( "id", sControlID + "-menu" )
			.attr( "class", "popup" );
		var menu = menuPopup.append( "ul" )
			.attr( "class", "menu" );
		menu.append( "li" )
			.append( "a" )
			.attr( "id", sControlID + "-menu-savesvg" )
			.attr( "download", "pedigree.svg" )
			.text( "Save as SVG" );
		menu.selectAll( "li" )
			.on( "click",
				function ()
				{
					menuPopup.transition()
						.duration( 500 )
						.style( "opacity", 0.0 )
						.each( "end", function () { menuPopup.style( "display", "none" ); } );
				}
			);
*/
        var oTooltipPopup = oControl.append("div").attr("id", sControlID + "-tooltip").attr("class", "tooltip");
        var oSVG = oControl.append("svg").attr("id", sControlID + "-svg").attr("width", iWidth + this.mPedigreeMargin.left + this.mPedigreeMargin.right).attr("height", iHeight + this.mPedigreeMargin.top + this.mPedigreeMargin.bottom);
        /*
			.on( "click",
				function ()
				{
					if ( menuPopup.style( "display" ) !== "none" )
					{
						menuPopup.transition()
							.duration( 500 )
							.style( "opacity", 0.0 )
							.each( "end", function () { menuPopup.style( "display", "none" ); } );
					}
					if ( contextmenuPopup.style( "display" ) !== "none" )
					{
						contextmenuPopup.transition()
							.duration( 500 )
							.style( "opacity", 0.0 )
							.each( "end", function () { contextmenuPopup.style( "display", "none" ); } );
					}
				}
			)
			.on( "contextmenu",
				function ()
				{
					if ( contextmenuPopup.style( "display" ) !== "none" )
					{
						contextmenuPopup.transition()
							.duration( 500 )
							.style( "opacity", 0.0 )
							.each( "end", function () { contextmenuPopup.style( "display", "none" ); } );
					}
					var position = d3.mouse( this );
					menuPopup
						.style( "left", position[ 0 ] + "px" )
						.style( "top", position[ 1 ] + "px" )
						.style( "opacity", 0.0 )
						.style( "display", "block" );
					menuPopup.select( "#" + sControlID + "-menu-savesvg" )
						.attr( "href", "data:application/octet-stream;base64," + window.btoa(
							"<svg iWidth=\"" + ( iWidth + oThis.mPedigreeMargin.left + oThis.mPedigreeMargin.right ) + "\" height=\"" + ( iHeight + oThis.mPedigreeMargin.top + oThis.mPedigreeMargin.bottom ) + "\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n" +
							//"<style type="text/css" ><![CDATA[\n" + pedigreeCSS + "\n]]></style>\n" +
							d3.select( "#" + sControlID + "-svg" ).html() +
							"\n</svg>"
						) );
					menuPopup.transition()
						.duration( 500 )
						.style( "opacity", 1.0 );
					d3.event.preventDefault();
				}
			);
*/
        var oDefs = oSVG.append("defs");
        var oMainGroup = oSVG.append("g").attr("transform", "translate(" + this.mPedigreeMargin.left + "," + this.mPedigreeMargin.top + ")");
        oMainGroup.shift = {
            x: 0,
            y: 0
        };
        oMainGroup.scale = 1.0;
        var oZoom = d3.behavior.zoom().scaleExtent([
            0.1,
            10
        ]).on("zoom", function () {
            oThis.updateZoom(oMainGroup, oZoom, false);
        });
        oSVG.call(oZoom).on("dblclick.zoom", function () {
            oZoom.translate([
                0,
                0
            ]).scale(1.0);
            oThis.updateZoom(oMainGroup, oZoom, true);
        });
        var oData = this.getData();
        if ($.isEmptyObject(oData)) {
            return;
        }
        var aNodes = oTree.nodes(oData);
        for (var iIndex = 0; iIndex < aNodes.length; ++iIndex) {
            aNodes[iIndex].y = iHeight - aNodes[iIndex].y;
        }
        oMainGroup.selectAll(".link").data(oTree.links(aNodes)).enter().append("path").attr("id", function (oLink) {
            return sControlID + "-" + oLink.source.id + "-link";
        }).attr("class", "link").attr("d", oThis.elbow);
        // add clippings
        oDefs.append("clipPath").attr("id", "square-clip").append("rect").attr("x", -25).attr("y", -25).attr("width", 50).attr("height", 50);
        oDefs.append("clipPath").attr("id", "circle-clip").append("circle").attr("r", 25);
        // add groups
        var oIndividualGroups = oMainGroup.selectAll(".nodes").data(aNodes).enter().append("g").attr("id", function (oNode) {
            return sControlID + "-" + oNode.id;
        }).attr("class", "individual").classed("ignore", function (oNode) {
            return oNode.hasOwnProperty("ignore") && oNode.ignore;
        }).attr("transform", function (oNode) {
            return "translate(" + oNode.x + "," + oNode.y + ")";
        });
        var oNodeGroups = oIndividualGroups.append("g").attr("class", "node").attr("clip-path", function (oNode) {
            return oNode.sex === "male" ? "url(#square-clip)" : "url(#circle-clip)";
        });
        // draw unaffected area
        oNodeGroups.append("rect").attr("class", function (oNode) {
            return oNode.hasOwnProperty("affected") ? "unaffected" : "unknown";
        }).attr("stroke", "none").attr("x", -24).attr("y", -24).attr("width", 48).attr("height", 48);
        // draw affected area
        oNodeGroups.filter(function (oNode) {
            return oNode.hasOwnProperty("affected") && oNode.hasOwnProperty("comparison");
        }).append("rect").attr("class", "affected").attr("x", -24).attr("y", -24).attr("width", 24).attr("height", function (oNode) {
            return 48 * oNode.affected;
        });
        oNodeGroups.filter(function (oNode) {
            return oNode.hasOwnProperty("affected") && oNode.hasOwnProperty("comparison");
        }).append("rect").attr("class", "affected").attr("x", 0).attr("y", -24).attr("width", 24).attr("height", function (oNode) {
            return 48 * oNode.comparison;
        });
        oNodeGroups.filter(function (oNode) {
            return oNode.hasOwnProperty("affected") && !oNode.hasOwnProperty("comparison");
        }).append("path").attr("class", "affected").attr("d", oThis.filling);
        // draw frames
        oNodeGroups.filter(function (oNode) {
            return oNode.hasOwnProperty("comparison");
        }).append("line").attr("class", "frame").attr("x1", 0).attr("y1", -24).attr("x2", 0).attr("y2", +24);
        oNodeGroups.filter(function (oNode) {
            return oNode.sex === "male";
        }).append("rect").attr("class", "frame").attr("fill", "transparent").attr("x", -24).attr("y", -24).attr("width", 48).attr("height", 48);
        oNodeGroups.filter(function (oNode) {
            return oNode.sex === "female";
        }).append("circle").attr("class", "frame").attr("fill", "transparent").attr("r", 24);
        /*
		// add context menus
		oNodeGroups.on( "contextmenu",
			function ( oNode )
			{
				if ( oTooltipPopup.style( "display" ) !== "none" )
				{
					oTooltipPopup.transition()
						.duration( 500 )
						.style( "opacity", 0.0 )
						.each( "end", function () { oTooltipPopup.text( "" ).style( "display", "none" ); } );
				}
				if ( menuPopup.style( "display" ) !== "none" )
				{
					menuPopup.transition()
						.duration( 500 )
						.style( "opacity", 0.0 )
						.each( "end", function () { menuPopup.style( "display", "none" ); } );
				}
				var position = d3.mouse( this );
				contextmenuPopup
					.style( "left", ( oThis.mPedigreeMargin.left + ( oNode.x + position[ 0 ] ) * oMainGroup.scale + oMainGroup.shift.x ) + "px" )
					.style( "top", ( oThis.mPedigreeMargin.top + ( oNode.y + position[ 1 ] ) * oMainGroup.scale + oMainGroup.shift.y ) + "px" )
					.style( "opacity", 0.0 )
					.style( "display", "block" );
				contextmenuPopup.transition()
					.duration( 500 )
					.style( "opacity", 1.0 );
				d3.event.preventDefault();
				d3.event.stopPropagation();
			}
		);
*/
        oNodeGroups.on("click", function (oNode) {
            if (oNode.hasOwnProperty("ignore") && oNode.ignore) {
                oNode.ignore = false;
            } else {
                oNode.ignore = true;
            }
            d3.select("#" + sControlID + "-" + oNode.id).classed("ignore", oNode.ignore);
            if (d3.select("#" + sControlID + "-" + oNode.id + " .info").style("display") === "none") {
                d3.select("#" + sControlID + "-" + oNode.id + " .info").style("display", "block");
            } else {
                d3.select("#" + sControlID + "-" + oNode.id + " .info").style("display", "none");
            }
        });
        oNodeGroups.filter(function (oNode) {
            return oNode.hasOwnProperty("details");
        }).on("mouseover", function (oNode) {
            //if ( ( d3.select( "#" + sControlID + "-menu" ).style( "display" ) === "none" ) && ( d3.select( "#" + sControlID + "-contextmenu" ).style( "display" ) === "none" ) )
            var displayVal = d3.select("#" + sControlID + "-" + oNode.id + " .info").style("display");
            d3.select("#" + sControlID + "-tooltip").style("opacity", 0.0).style("display", "block").text(oNode.details).style("left", oThis.mPedigreeMargin.left + oNode.x * oMainGroup.scale + oMainGroup.shift.x - $("#" + sControlID + "-tooltip").outerWidth(true) / 2 + "px").style("top", oThis.mPedigreeMargin.top + (oNode.y + (oNode.hasOwnProperty("info") && displayVal === 'block' ? 48 : 26)) * oMainGroup.scale + 16 + oMainGroup.shift.y + "px").transition().duration(500).style("opacity", 1.0);
            d3.event.preventDefault();
            d3.event.stopPropagation();
        }).on("mouseout", function () {
            if (oTooltipPopup.style("display") !== "none") {
                oTooltipPopup.transition().duration(500).style("opacity", 0.0).each("end", function () {
                    oTooltipPopup.text("").style("display", "none");
                });
            }
            d3.event.preventDefault();
            d3.event.stopPropagation();
        });
        // add labels
        oIndividualGroups.filter(function (oNode) {
            return oNode.hasOwnProperty("label");
        }).append("text").attr("class", "label").attr("x", 0).attr("y", -32).text(function (oNode) {
            return oNode.label;
        });
        // add additional information
        oIndividualGroups.filter(function (oNode) {
            return oNode.hasOwnProperty("info");
        }).append("text").attr("class", "info").style("display", "none").attr("x", 0).attr("y", +48).text(function (oNode) {
            return oNode.info;
        });
        // add deceased indicators
        oIndividualGroups.filter(function (oNode) {
            return oNode.hasOwnProperty("deceased") && oNode.deceased;
        }).append("line").attr("class", "deceased").attr("x1", -28).attr("y1", +28).attr("x2", +28).attr("y2", -28);
    },
    elbow: function (oLink) {
        return 'M' + oLink.source.x + ',' + (oLink.source.hasOwnProperty('label') ? oLink.source.y - 48 : oLink.source.y - 25) + 'V' + oLink.target.y + 'H' + (oLink.target.x > oLink.source.x ? oLink.target.x - 25 : oLink.target.x + 25);
    },
    filling: function (oNode) {
        return 'M+24,-24' + (oNode.affected < 0.5 ? 'L' + (24 - 96 * oNode.affected) + ',-24L+24,' + (-24 + 96 * oNode.affected) : 'L-24,-24V' + (-24 + 96 * (oNode.affected - 0.5)) + 'L' + (+24 - 96 * (oNode.affected - 0.5)) + ',+24H+24');
    },
    /*
	startZoom: function ( sControlID )
	{
		var menuPopup = d3.select( '#' + sControlID + '-menu' );
		if ( menuPopup.style( 'display' ) !== 'none' )
		{
			menuPopup.transition()
				.duration( 500 )
				.style( 'opacity', 0.0 )
				.each( 'end', function () { menuPopup.style( 'display', 'none' ); } );
		}
		var contextmenuPopup = d3.select( '#' + sControlID + '-contextmenu' );
		if ( contextmenuPopup.style( 'display' ) !== 'none' )
		{
			contextmenuPopup.transition()
				.duration( 500 )
				.style( 'opacity', 0.0 )
				.each( 'end', function () { contextmenuPopup.style( 'display', 'none' ); } );
		}
	},
*/
    updateZoom: function (oGroup, oZoom, bForceAnimation) {
        var x = oZoom.translate()[0];
        var y = oZoom.translate()[1];
        var scale = oZoom.scale();
        if (bForceAnimation || scale < 0.9 * oGroup.scale || scale > 1.1 * oGroup.scale) {
            oGroup.transition().duration(200).attr('transform', 'translate(' + (this.mPedigreeMargin.left + x) + ',' + (this.mPedigreeMargin.top + y) + ') scale(' + scale + ')');
        } else {
            oGroup.attr('transform', 'translate(' + (this.mPedigreeMargin.left + x) + ',' + (this.mPedigreeMargin.top + y) + ') scale(' + scale + ')');
        }
        oGroup.shift = {
            'x': x,
            'y': y
        };
        oGroup.scale = scale;
    }
});