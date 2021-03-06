// Set of 20 colors automatically assigned
var fill = d3.scale.category20()
var data;

// Settings for graph nodes
var minNodeSize = 5,
    maxNodeSize = 30,
    padding = 1.5,
    svgX = 0,
    svgY = 200;

var displayingFreq = false;

// Graph widths and heights, based on window sizing
let stateWidth = window.innerWidth / 2;
let stateHeight = window.innerHeight;
let sequenceWidth = (window.innerWidth / 2) - 1;
let sequenceHeight = window.innerHeight;
let groupHeight = 250;
let groupWidth = 250;

var div, svg;
var groupSvg;

var userIDLengthLimit = 10;
file_suffix = '';

// The below loads data from server
d3.json('data/visualization_ids.json', function (error, sessionList) {
    if (error) {
        alert("The file containing the list of match IDs does not exist.");
        return console.warn(error);
    }
    dd = sessionList;

    // Add match options to the UI
    var selectUI = d3.select("#level-select")
    var options = selectUI.selectAll('option').data(dd); // Data join
    // Add names to the match options
    options.enter()
        .append("option")
        .text(function (d) {
            return d;
        });

    // Automatically select first in list
    selectUI.property("value", dd[0]);

    // graph stores the loaded data
    sID = d3.select("#level-select").node().value;
    // console.log(sID);
    d3.json('data/' + sID + file_suffix + '.json', updateJSON);

});

var prevStroke, prevFill, prevFillOpa, prevStrokeOpa, prevTextFill;

/******************** State graph **********************************/

// D3 force-directed layout
var stateforce = d3.layout.force()
    .charge(-1500)
    .linkDistance(1000)
    .size([stateWidth, stateHeight])
    .on("tick", statetick);

// Append State Graph to DOM
svg = d3.select("#state-graph-svg")
    .attr("width", stateWidth)
    .attr("height", stateHeight)
    .attr("pointer-events", "all")
    .call(d3.behavior.zoom().on("zoom", stateZoomPan))
    .on("dblclick.zoom", null)
    .append("svg:g")
    .attr("transform", "translate(200,200)scale(.5,.5)");


// the graph components (nodes and links)
var stateSvgContainer = svg.append("g").attr("id", "stategraph_container");
let statelink = stateSvgContainer.append("g").attr("id", "statelink_container").selectAll(".statelink");
let statenode = stateSvgContainer.append("g").attr("id", "statenode_container").selectAll(".statenode");

// Define markers
// Per-type markers, as they don't inherit styles.
svg.append("defs").selectAll("marker")
    .data(["start", "mid", "end"])
    .enter().append("marker")
    .attr("id", function (d) {
        return d;
    })
    // the region viewable in this marker
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 15)
    .attr("refY", 0)
    .attr("markerWidth", 30) //1.5)
    .attr("markerHeight", 30) //1.5)
    .attr("markerUnits", "userSpaceOnUse")
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5");

// For sticky drag
var statedrag = stateforce.drag().on("dragstart", dragstart);

/********************* Behavior graph ******************************/

// Set min and max distance
const minDistance = 50;
const maxDistance = 500;

// D3 force-directed layout
var behaviorforce = d3.layout.force()
    .charge(-100)
    .linkDistance(distanceMapping)
    .size([sequenceWidth, sequenceHeight])
    .on("tick", behaviortick);

// Append Sequence Graph to DOM
svg = d3.select("#sequence-graph-svg")
    .attr("width", sequenceWidth)
    .attr("height", sequenceHeight)
    .attr("pointer-events", "all")
    .call(d3.behavior.zoom().on("zoom", behaviorZoomPan))
    .on("dblclick.zoom", null)


// the graph components (nodes and links)
var behaviorSvgContainer = svg.append("g").attr("id", "graph_container");
var behaviorlink = behaviorSvgContainer.append("g").attr("id", "link_container").selectAll(".behaviorlink");
var behaviornode = behaviorSvgContainer.append("g").attr("id", "node_container").selectAll(".behaviornode");


// For sticky drag
var behaviordrag = behaviorforce.drag()
    .on("dragstart", behaviorDragstart);

//--------------- Functions ------------
var stateMap = {};
var actionMap = {};

// Update function for incoming JSON
function updateJSON(error, json) {

    if (error) {
        alert("Level does not exist!");
        return console.warn(error);
    }
    data = json;

    // update info on num statenodes and players
    d3.select("#level-id").text(data.level_info);
    d3.select("#num-statenodes").text(data.nodes.length);

    // set statemap for fast access
    stateMap = {};
    data.nodes.forEach(function (aNode) {
        stateMap[aNode.id] = aNode;
    });

    // set actionmap for fast access
    actionMap = {};
    data.links.forEach(function (aLink) {
        actionMap[aLink.id] = aLink;
    });

    visualizeStateData();

    // If Group Graph Container exists add group trajectories from data
    if (data.team_trajectories) {
        let group = document.getElementById('group-graph-container')
        group.classList.remove('none')
        d3.select("#group-trajectories").text(data.team_trajectories.length);
        visualizeGroupData();
    }

    // update info on num nodes and players
    d3.select("#num-sequences").text(data.trajectories.length);
    d3.select("#num-players").text(data.num_users);
    d3.select("#num-teams").text(data.team_trajectories.length);

    visualizeBehaviorData();

    // Show links between nodes, can be toggled by user
    showLinks = true;
    toggleShowLinks();
}

// Functions for when user changes level
function updateLevel() {
    clearHighlight();
    clearTextField();
    clearGroupNodesActive();
    sID = d3.select("#level-select").node().value;
    d3.json('data/' + sID + file_suffix + '.json', updateJSON);
}

/******************** State graph **********************************/
var linearStateNodeScale, linearStateLinkScale;

var presetStateNodes = function (nodes) {

    // Settings for State nodes
    margin = 100;
    maxX = 890;

    nodeSpacing = (maxX - 2 * margin) / 8;
    yNodeSpacing = 200;

    // Prefix positions of start and end nodes------
    nodes[0].fixed = true;
    nodes[0].x = margin;
    nodes[0].y = margin;

    nodes[1].fixed = true;
    nodes[1].x = stateWidth - margin;
    nodes[1].y = stateHeight - margin;
};

// Set labels
var state_node_label = function (d) {
    return extractDetails(d.details);
};

// Set labels
var state_link_label = function (d) {
    return d.details;
};

// Visualization for State data
function visualizeStateData() {
    linearStateNodeScale = getStateNodeScale(data.nodes);
    linearStateLinkScale = getStateLinkScale(data.links);

    // Prefix positions of start and end nodes
    presetStateNodes(data.nodes);

    // Add links to the state via d3 force
    stateforce.nodes(data.nodes)
        .links(data.links);

    // d3 force
    statelink = statelink.data(data.links);
    statenode = statenode.data(data.nodes);

    // d3 v3 exit and remove methods, necessary for update
    statelink.exit().remove();
    statenode.exit().remove();

    // d3 update (d3 v3 pattern)
    // Update for statelink and statenode
    statelink.attr("id", function (d, i) {
        return 'statelink' + d.id;
    })
        .attr("class", updateLinkClass)
        .style("stroke-width", getStrokeWidth)
        .attr("marker-end", function (d) {
            return "url(#mid)";

        });
    statelink.select("title").text(function (d) {
        return state_link_label(d);
    });

    statenode.attr("id", function (d, i) {
        return 'statenode' + d.id;
    })
        .attr("class", function (d) {
            return "statenode " + d.type;
        })
        .select("circle")
        .attr("class", function (d) {
            return d.type;
        })
        .attr("r", function (d) {
            return linearStateNodeScale(d.user_ids.length);
        });

    statenode.select("text")
        .attr("class", function (d) {
            return d.type;
        })
        .attr("dx", function (d) {
            return linearStateNodeScale(d.user_ids.length);
        })
        .attr("font-size", function (d) {
            return maxNodeSize;
        })
        .text(function (d, i) {
            return state_node_label(d);
        });

    statenode.select("title").text(function (d) {
        return state_node_label(d);
    });

    // d3 enter (d3 v3 pattern)
    // Enter for statelink and stategroup
    var statelinkGroup = statelink.enter().append("path") //.append("line")
        .attr("class", updateLinkClass)
        .attr("id", function (d, i) {
            return 'statelink' + d.id;
        })
        .style("stroke-width", getStrokeWidth)
        .attr("marker-end", function (d) {
            return "url(#mid)";
        })
        .on("click", function (d) {
            stateLinkClicked(d)
        })
        .on("dblclick", function (d) {
            setPlaytraceIndex(d)
            highlightNodeID()
        })
        .on("mouseover", function (d) {
            if (!d3.select("#playtrace-index").node().value) {
                highlightNodeStroke(d, true)
            }
        })
        .on("mouseout", function (d) {
            highlightNodeStroke(d, false)
        })

    statelinkGroup.append("title").text(function (d) {
        return state_link_label(d);
    });

    // Append group for dragging
    var statenodeGroup = statenode.enter().append("g")
        .attr("class", function (d) {
            return "statenode " + d.type;
        })
        .attr("id", function (d, i) {
            return 'statenode' + d.id;
        })
        .call(statedrag);

    statenodeGroup.append("title").text(function (d) {
        return state_node_label(d);
    });

    statenodeGroup.append("circle")
        .attr("r", function (d) {
            return linearStateNodeScale(d.user_ids.length);
        })
        .on("mouseover", stateDisplayInfo);

    statenodeGroup.append("text")
        .attr("dx", function (d) {
            return linearStateNodeScale(d.user_ids.length);
        })
        .attr("dy", ".35em")
        .attr("class", function (d) {
            return d.type;
        })
        .attr("font-size", function (d) {
            return maxNodeSize;
        })
        .text(function (d, i) {
            return state_node_label(d);
        });

    stateforce.start();
}


// Group Graph
var groupForce = d3.layout.force()
    .charge(-100)
    // TODO Enable distance mapping
    // .linkDistance(distanceMapping)
    .linkDistance(100)
    .size([groupWidth, groupHeight])
    .on("tick", groupTick);

// Append Group Graph to the DOM
groupSvg = d3.select("#group-graph-svg")
    .attr("width", groupWidth)
    .attr("height", groupHeight)
    .attr("pointer-events", "all")
    .call(d3.behavior.zoom().on("zoom", behaviorZoomPan))
    .on("dblclick.zoom", null)

// the graph components (nodes and links)
var groupSvgContainer = groupSvg.append("g").attr("id", "group-graph-container");
var groupLink = groupSvgContainer.append("g").attr("id", "group-link-container").selectAll(".groupLink");
var groupNode = groupSvgContainer.append("g").attr("id", "group-node-container").selectAll(".groupNode");


// For sticky drag
var groupDrag = groupForce.drag()
    .on("dragstart", groupDragStart);

//--------------- Functions ------------


// flag: 1 - popularity, 2 - look significant
// can create function instead of copying codes
var changeStateNodeSizeType = function (flag) {
    switch (flag) {

        case 1:
            statenode
                .select("circle")
                .attr("r", function (d) {
                    return linearStateNodeScale(d.user_ids.length);
                });
            statenode.select("text")
                .attr("font-size", function (d) {
                    return linearStateNodeScale(d.user_ids.length);
                })
            break;

        case 2:
            statenode
                .select("circle")
                .attr("r", function (d) {
                    if (d.type == 'mid')
                        return linearStateNodeScale(getLookSignificance(d));
                    return maxNodeSize;
                });
            statenode.select("text")
                .attr("font-size", function (d) {
                    if (d.type == 'mid')
                        return linearStateNodeScale(getLookSignificance(d));
                    return maxNodeSize;
                })
            break;

    }
};

// d3 v3 pattern for tick
function statetick(e) {
    statelink.attr("d", function (d) {
        var x1 = d.source.x,
            y1 = d.source.y,
            x2 = d.target.x,
            y2 = d.target.y,
            dx = x2 - x1,
            dy = y2 - y1,
            dr = Math.sqrt(dx * dx + dy * dy),

            // Defaults for normal edge.
            drx = dr,
            dry = dr,
            xRotation = 0,
            largeArc = 0,
            sweep = 1;

        // Self edge.
        if (x1 === x2 && y1 === y2) {
            // Fiddle with this angle to get loop oriented.
            xRotation = -45;

            // Needs to be 1.
            largeArc = 1;

            // Change sweep to change orientation of loop. 
            //sweep = 0;

            // Make drx and dry different to get an ellipse
            // instead of a circle.
            drx = 30;
            dry = 20;

            // For whatever reason the arc collapses to a point if the beginning
            // and ending points of the arc are the same, so kludge it.
            x2 = x2 + 1;
            y2 = y2 + 1;
        }

        return "M" + x1 + "," + y1 + "A" + drx + "," + dry + " " + xRotation + "," + largeArc + "," + sweep + " " + x2 + "," + y2;
    });

    statenode
        .each(collide(.5))
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        })
}


// Move nodes toward cluster focus.
function gravity(alpha) {
    return function (d) {
        if (d.type == 'mid') {
            d.y += (foci[gravityFocus[d.details.affect]].y - d.y) * alpha;
            d.x += (foci[gravityFocus[d.details.affect]].x - d.x) * alpha;
        }
    };
}

function getStrokeWidth(d) {
    return linearStateLinkScale(d.user_ids.length);
}

function updateLinkClass(d) {
    return 'statelink mid';
}

function getLinkTypeFromMeaning(meaning) {
    return "mid";
}

// Get node scale based on min and max values
function getStateNodeScale(dataset) {
    var minVisits = d3.min(dataset, function (d) {
        return d.user_ids.length;
    });
    var maxVisits = d3.max(dataset, function (d) {
        return d.user_ids.length;
    });

    return d3.scale.linear()
        .domain([minVisits, maxVisits])
        .range([minNodeSize, maxNodeSize]);
}

// Get link scale based on min and max values
function getStateLinkScale(dataset) {
    var minVisits = d3.min(dataset, function (d) {
        return d.user_ids.length;
    });
    var maxVisits = d3.max(dataset, function (d) {
        return d.user_ids.length;
    });

    return d3.scale.linear()
        .domain([minVisits, maxVisits])
        .range([minNodeSize, maxNodeSize]);
}

// Collision detection
// Resolves collisions between d and all other circles.
function collide(alpha) {
    var quadtree = d3.geom.quadtree(data.nodes);
    return function (d) {
        // the radius of the current node
        var d_radius = linearStateNodeScale(d.user_ids.length);
        var r = d_radius + maxNodeSize + padding,
            nx1 = d.x - r,
            nx2 = d.x + r,
            ny1 = d.y - r,
            ny2 = d.y + r;

        quadtree.visit(function (quad, x1, y1, x2, y2) {
            if (quad.point && (quad.point !== d)) {
                var x = d.x - quad.point.x,
                    y = d.y - quad.point.y,
                    l = Math.sqrt(x * x + y * y),
                    r = d_radius + linearStateNodeScale(quad.point.user_ids.length) + padding;
                if (l < r) {
                    l = (l - r) / l * alpha; // padding
                    d.x -= x *= l;
                    d.y -= y *= l;
                    quad.point.x += x;
                    quad.point.y += y;
                }
            }
            return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        });
    };
}

// d3 zoom and pan for State Graph
function stateZoomPan() {
    stateSvgContainer.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}
// d3 zoom and pan for Sequence Graph
function behaviorZoomPan() {
    behaviorSvgContainer.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

// For sticky drag
// This callback can access this (the DOM object it is called upon)
function dblclick(d) {
    // Somehow this works, but 
    // d3.event.sourceEvent.stopPropagation(); does not

    d3.event.stopPropagation();
    d3.select(this).classed("fixed", d.fixed = false);
}

function dragstart(d) {
    d3.event.sourceEvent.stopPropagation();
    d3.select(this).classed("fixed", d.fixed = true);
    stateDisplayInfo(d);
}

// Display info in textboxes
function stateDisplayInfo(d) {

    d3.select("#statenode-id").text(d.id);
    d3.select("#statenode-info").text(extractDetails(d.details));
    d3.select("#statenode-stats").text(extractStats(d.stats));
    d3.select("#num-players-state").text(d.user_ids.length);
    if (d.user_ids.length <= userIDLengthLimit)
        d3.select("#players-state").text(d.user_ids);
    else d3.select("#players-state").text(d.user_ids.slice(0, userIDLengthLimit) + ",....");
}

// Display link info in textboxes
function stateLinkClicked(d) {
    d3.select("#num-players-statelink").text(d.user_ids.length);
    if (d.user_ids.length <= userIDLengthLimit)
        d3.select("#players-statelink").text(d.user_ids);
    else d3.select("#players-statelink").text(d.user_ids.slice(0, userIDLengthLimit) + ",....");
    d3.select("#statelink-info").text(state_link_label(d));
}

function getNumTrue(itemArray) {
    var result = 0;
    for (var i = 0; i < itemArray.length; i++) {
        if (itemArray[i][2]) result++;
    }
    return result;
}

// Index 0: start, index 1: end
function setNodeForFreq(index) {
    var value = d3.select("#statenode-id").text();
    if (index == 0) {
        d3.select("#freq-start-node").node().value = value;
    } else d3.select("#freq-end-node").node().value = value;
}


/*************************** Behavior graph *******************/

var linearScaleBehaviorNode, distanceBehaviorScale;

// Depending on state of completion, return state string
function returnHTML(d, i) {
    var nodeinfo = i + " (";
    if (d.completed) {
        nodeinfo = nodeinfo + "reach end state)";
    } else {
        nodeinfo = nodeinfo + "does not reach end state)"
    };

    return `<div class="tooltip-inner">
                <div><span class="tooltip-key">Sequence Node Info: </span>${nodeinfo}</div>
                <div><span class="tooltip-key">Player IDs with this Pattern:</span> (${d.user_ids.length}) ${d.user_ids.join('')}</div>
                <div><span class="tooltip-key">Action Sequence: </span>${compressArray(d.action_meaning)}</div>
            </div>`
}

function visualizeBehaviorData() {
    let tooltip = d3.select('#tooltip')
    linearScaleBehaviorNode = getBehaviorNodeScale(data.trajectories);
    distanceBehaviorScale = getBehaviorDistanceScale(data.traj_similarity);

    behaviorforce.nodes(data.trajectories)
        .links(data.traj_similarity);

    behaviorlink = behaviorlink.data(data.traj_similarity);
    behaviornode = behaviornode.data(data.trajectories);

    // d3 enter method for behavior link
    behaviorlink.enter().append("line")
        .attr("class", "behaviorlink")
        .attr("id", function (d, i) {
            return 'behaviorlink' + d.id;
        });

    // d3 enter method for behavior node
    behaviornode.enter().append("g")
        .attr("id", function (d, i) {

            return 'behaviornode' + i;
        })
        .attr("color", function (d) {
            if (d.id > 20) {
                let divisor = Math.floor(d.id / 20)
                let new_id = d.id - (20 * divisor)
                return fill(new_id)
            } else {
                return fill(d.id)
            }
        })
        .call(behaviordrag);

    // Add SVG circle to behaviornode group
    behaviornode.append("circle")
        .attr("r", function (d) {
            return linearScaleBehaviorNode(d.user_ids.length);
        })
        .attr('pointer-events', 'fill')
        .attr('cursor', 'pointer')
        .on("mouseover", function (d, i) {
            activateCompleteSequence()
            displayInfo(d)
            shuffleNodeOrder(d.index)
            tooltip
                .style('opacity', 1)
                .style("left", d3.event.pageX + "px")
                .style("top", d3.event.pageY + "px")
                .html(returnHTML(d, i))
        })
        .on("mouseout", function (d) {
            tooltip
                .style('opacity', 0)
        })

    // Add text to behaviornode group
    behaviornode.append("text")
        .attr("class", function (d) {
            if (d.completed)
                return "complete";
            return "incomplete";
        })
        .attr("dx", function (d) {
            return linearScaleBehaviorNode(d.user_ids.length) + 3;
        })
        .attr("dy", ".35em")
        .attr("font-size", function (d) {
            return maxNodeSize;
        })
        .text(function (d, i) {
            return i;
        });

    // d3 update (d3 v3 pattern)
    behaviorlink.attr("id", function (d, i) {
        return 'behaviorlink' + d.id;
    })
        .attr("class", "behaviorlink");

    behaviornode.attr("id", function (d, i) {
        return 'behaviornode' + i;
    })
        .attr("class", function (d) {
            if (d.completed)
                return `behaviornode complete ${d.user_ids[0]} ${d.id}`;
            return `behaviornode incomplete ${d.user_ids[0]} ${d.id}`;
        })
        .attr("node_index", function (d) {
            return d.id
        })
        .select("circle")
        .attr("class", function (d) {
            if (d.completed)
                return "complete";
            return "incomplete";
        })
        .attr("r", function (d) {
            return linearScaleBehaviorNode(d.user_ids.length);
        });

    behaviornode.select("text")
        .attr("class", function (d) {
            if (d.completed)
                return "complete";
            return "incomplete";
        })
        .attr("dx", function (d) {
            return linearScaleBehaviorNode(d.user_ids.length) + 3;
        })
        .attr("font-size", function (d) {
            return maxNodeSize;
        })
        .text(function (d, i) {
            return i;
        });

    // d3 exit pattern
    behaviorlink.exit().remove();
    behaviornode.exit().remove();
    behaviorforce.start();
}

// Group Graph

function visualizeGroupData() {
    // TODO add tooltip to Group Graph nodes
    // let tooltip = d3.select('#tooltip')
    groupForce.nodes(data.team_trajectories)
        .links(data.team_traj_similarity);

    groupLink = groupLink.data(data.team_traj_similarity);
    groupNode = groupNode.data(data.team_trajectories);

    // d3 enter pattern
    groupLink.enter().append("line")
        .attr("class", "groupLink")
        .attr("id", function (d, i) {
            return 'groupLink' + d.id;
        });

    groupNode.enter().append("g")
        .attr("class", function (d) {
            return `groupNode groupNode${d.id}`
        })
        .call(groupDrag);

    groupNode.append("circle")
        .attr("id", function (d, i) {
            return 'groupNode' + i;
        })
        .attr('r', 15)
        .attr('pointer-events', 'fill')
        .attr('cursor', 'pointer')
        .on("click", function (d) {
            clearGroupNodesActive()
            d3.select(this).classed('groupNode-active', true)
            highlightIndTrajectories(d)
        })

    groupNode.append("text")
        .attr("dx", ".9em")
        .attr("dy", ".4em")
        .text(function (d, i) {
            return i;
        });

    // d3 update (d3 v3 pattern)
    groupLink.attr("id", function (d, i) {
        return 'groupLink';
    })
        .attr("class", "groupLink");

    groupNode
        .select("circle")
        .attr('r', 15)


    groupNode.select("text")
        .attr("font-size", function (d) {
            return 20;
        })
        .text(function (d, i) {
            return i;
        });

    // d3 exit pattern
    groupLink.exit().remove();
    groupNode.exit().remove();
    groupForce.start();
}

// On select, clear other active group nodes
function clearGroupNodesActive() {
    d3.selectAll('.groupNode')
        .each(function (d) {
            let el = document.getElementById(`groupNode${d.index}`)
            if (el.classList.contains('groupNode-active')) {
                el.classList.remove('groupNode-active')
            }
        })
}

// Get unique value
function unique(value, index, self) {
    return self.indexOf(value) === index;
}

// Highlight individual sequence trajectories
// Used in Highlight Panel
function highlightIndTrajectories(d) {
    let uniqueTraj = d.team_members_index.filter(unique)
    setPlaytraceIndex(uniqueTraj)
    highlightNodeID()

}

// Shuffles order of sequences in data, resulting in relayering and rerendering SVG elements
function shuffleNodeOrder(node) {
    nArray = d3.select("#playtrace-index").node().value.replace(/\s/g, '').split(",");
    let hoverNode = node.toString()
    if (nArray.includes(hoverNode)) {
        highlightNodeID(false, hoverNode)
    }
}

// Distance mapping with similariry
function distanceMapping(d) {
    return distanceBehaviorScale(d.similarity);
}

// d3 v3 pattern, tick behavior
function behaviortick() {
    behaviorlink.attr("x1", function (d) {
        return d.source.x;
    })
        .attr("y1", function (d) {
            return d.source.y;
        })
        .attr("x2", function (d) {
            return d.target.x;
        })
        .attr("y2", function (d) {
            return d.target.y;
        });
    behaviornode
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });
}

// d3 v3 pattern, tick behavior
function groupTick() {
    groupLink.attr("x1", function (d) {
        return d.source.x;
    })
        .attr("y1", function (d) {
            return d.source.y;
        })
        .attr("x2", function (d) {
            return d.target.x;
        })
        .attr("y2", function (d) {
            return d.target.y;
        });
    groupNode
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });
}

// Set minValue and maxValue
function getBehaviorNodeScale(dataset) {
    var minValue = d3.min(dataset, function (d) {
        return d.user_ids.length;
    });
    var maxValue = d3.max(dataset, function (d) {
        return d.user_ids.length;
    });
    // if minValue and maxValue are the same,
    // we'll make it such that the node takes the big size.
    if (minValue == maxValue)
        minValue -= 1;
    return d3.scale.linear()
        .domain([minValue, maxValue])
        .range([minNodeSize, maxNodeSize]);
}

function getBehaviorDistanceScale(dataset) {
    var minValue = d3.min(dataset, function (d) {
        return d.similarity;
    });
    var maxValue = d3.max(dataset, function (d) {
        return d.similarity;
    });

    return d3.scale.linear()
        .domain([minValue, maxValue])
        .range([minDistance, maxDistance]);
}

// Show links between behavior nodes, can be toggled
var showLinks = true;

// Toggle links
function toggleShowLinks() {
    if (showLinks) {
        d3.selectAll(".behaviorlink").style("stroke", "transparent");
    } else {
        d3.selectAll(".behaviorlink").style("stroke", null);
    }

    showLinks = !showLinks;
}

// Display info in textboxes
var displayInfo = function (d, i) {
    var nodeinfo = i + " (";
    if (d.completed) nodeinfo = nodeinfo + "reach end state)";
    else nodeinfo = nodeinfo + "does not reach end state)";

    // The start and end states are dummy
    d3.select("#num-states-in-trajectory").text(d.trajectory.length - 2);
    d3.select("#selected-node-index").text(nodeinfo);
    d3.select("#infobox").text(compressStates(d.trajectory));
    d3.select("#actionseq-info").text(compressArray(d.action_meaning));
    d3.select("#num-players-sequence").text(d.user_ids.length);
    if (d.user_ids.length <= userIDLengthLimit)
        d3.select("#players-sequence").text(d.user_ids);
    else d3.select("#players-sequence").text(d.user_ids.slice(0, userIDLengthLimit) + ",....");
};

var extractDetails = function (detail_obj) {
    // movement events: show the region
    if (detail_obj.event_type.indexOf('movement') !== -1)
        return detail_obj.metadata.encounter;
    return detail_obj.event_type;
};

// Get stats from the data object
var extractStats = function (stats_obj) {
    return JSON.stringify(stats_obj);
};

var compressStates = function (pArray) {
    items = _.map(pArray, function (a) { return extractDetails(data.nodes[a].details); });
    return compressArray(items);
};

var compressArray = function (pArray) {
    var actions = "";
    var prevAction = "";
    var prevActionCount = 0;
    var currItem;
    for (var i = 1; i < pArray.length - 1; i++) {

        currItem = pArray[i];

        if (prevAction != currItem) {
            if (prevAction != "") {
                actions += prevAction + "(" + prevActionCount.toString() + ")";
                actions += ", ";
            }
            prevAction = currItem;
            prevActionCount = 1;
        } else prevActionCount += 1;
    }
    actions += prevAction + "(" + prevActionCount.toString() + ")";

    return actions;
};

// Set lowest opacity
var lowestOpacity = 0.1;

// Start the drag behavior, d3 pattern
function behaviorDragstart(d, i) {
    d3.event.sourceEvent.stopPropagation();

    // Highlight the behavior
    clearHighlight();
    applyOpacity(lowestOpacity);
    highlightBehaviorNodeIndex(i, "red");
    archiveStyle(this);
}

// Start the drag behavior, d3 pattern
function groupDragStart(d, i) {
    d3.event.sourceEvent.stopPropagation();

    // Highlight the behavior
    clearHighlight();
    // applyOpacity(lowestOpacity);
    // highlightBehaviorNodeIndex(i, "red");
    archiveStyle(this);
}

// Set style
var archiveStyle = function (domNode) {
    prevStroke = d3.select(domNode).style("stroke");
    prevFill = d3.select(domNode).style("fill");
    prevStrokeOpa = d3.select(domNode).style("stroke-opacity");
    prevFillOpa = d3.select(domNode).style("fill-opacity");
    prevTextFill = d3.select(domNode).select("text").style("fill");
};

// Restore style
var restoreStyle = function (domNode) {
    d3.select(domNode).style("stroke-opacity", prevStrokeOpa)
        .style("stroke", prevStroke)
        .style("fill-opacity", prevFillOpa)
        .style("fill", prevFill);

    d3.select(domNode).select("text").style("fill", prevTextFill);
};

// Highlight node by ID, used by Highlight panel
var highlightNodeID = function (reverse = false, hoverNode) {
    nArray = d3.select("#playtrace-index").node().value.replace(/\s/g, '').split(",");
    if (nArray.length > 0 && nArray[0] !== '') {
        clearHighlight();
        applyOpacity(lowestOpacity);

        if (reverse)
            nArray = nArray.reverse();

        if (hoverNode) {
            let index = nArray.indexOf(hoverNode)
            nArray.splice(index, 1)
            nArray.push(hoverNode)
        }
        _.each(nArray, function (item, ind) {
            let color = d3.select(`#behaviornode${item}`).node().getAttribute('color')
            highlightBehaviorNodeIndex(parseInt(item), color)
        })
        displayInfo(data.trajectories[nArray[0]], nArray[0]);

        // if reverse is set, set the text to the reverse
        if (reverse)
            d3.select("#playtrace-index").node().value = nArray.join();
    }
};

var setPlaytraceIndex = function (d) {
    let arr = []
    if (d.user_ids) {
        d.user_ids.forEach((u) => {
            let node_index = d3.select(`.${u}`).attr('node_index')
            arr.push(node_index)
        })
    } else {
        d.forEach((u) => {
            arr.push(u)
        })
    }
    document.getElementById("playtrace-index").value = arr;
}

// Highlights the stroke the of the node, activated on playtrace hover in State Graph
var highlightNodeStroke = function (nodes, bool) {
    nodes.user_ids.forEach(d => {
        d3.select(`.${d}`).classed('selectednode', bool)
    })
};

// Highlights the stroke the of the node, activated in Highlight panel
var highlightNodeID_index = function (index = 0) {
    nArray = d3.select("#playtrace-index").node().value.replace(/\s/g, '').split(",");
    if (nArray.length > 0 && nArray[0] !== '') {
        clearHighlight();
        applyOpacity(lowestOpacity);
        if (index == -1)
            index = nArray.length - 1;
        highlightBehaviorNodeIndex(parseInt(nArray[index]), fill(index));
    }
};

// On hover displays trajectory sequence in lower right of screen
function showInfoNodeID() {
    var index = parseInt(d3.select("#playtrace-show-info").node().value);
    displayInfo(data.trajectories[index], index);
}
/*************************** Highlighting ******************/

// Clears all highlighting, direct DOM selection
function clearHighlight() {

    // clear all styles for state graph
    d3.selectAll(".statelink,.statenode").style("stroke-opacity", null)
        .style("stroke", null)
        .style("fill", null)
        .style("fill-opacity", null);

    d3.selectAll(".statenode circle").style("fill", null).style("stroke", null);

    d3.selectAll(".statenode").select("text")
        .style("fill", null)
        .style("fill-opacity", null);

    // clear behavior graph
    d3.selectAll(".behaviornode").style("stroke-opacity", null)
        .style("stroke", null)
        .style("fill", null)
        .style("fill-opacity", null);

    d3.selectAll(".behaviornode circle").style("fill", null).style("stroke", null);

    applyOpacity(currentOpacity);

    displayingFreq = false;
}

// Clears any text input by the user
function clearTextField() {
    document.getElementById('playtrace-index').value = '';
}

// Highlights by user id, used in the Highlight pane
var highlightUserID = function () {
    clearHighlight();
    input = d3.select("#userID").node().value;
    // 1. find the user traj from the trajectories
    userIDs = input.split(",");
    first_one_highlighted = true;
    _.each(userIDs, function (userID, id) {
        var trajIndex = -1;
        for (var i = 0; i < data.trajectories.length; i++) {
            if (_.includes(data.trajectories[i].user_ids, userID)) {
                trajIndex = i;
                break;
            }
        }

        if (trajIndex >= 0) {
            if (first_one_highlighted) {
                applyOpacity(lowestOpacity);
                first_one_highlighted = false;
            }
            // 2 is red
            highlightBehaviorNodeIndex(trajIndex, fill(id));
            found_user = true;
        } else {
            alert('cant find');
        }
    });
};

var groupCache = {};
// This function construct the key to retrieve from groupCache
var constructGroupKey = function (feature, groupValue) {
    return feature + '_' + groupValue;
};

// flag: 1: team2, blue; 2: team3, red; 0: all
var highlightGroup = function (flag) {
    clearHighlight();
    applyOpacity(lowestOpacity);
    switch (flag) {
        case 1:
            highlightGroupWithName('blue', 'blue');  //<!team2>
            break;
        case 2:
            highlightGroupWithName('red', 'red');  //<!team3>
            break;
        default:
            highlightGroupWithName('blue', 'blue');  //<!team2>
            highlightGroupWithName('red', 'red');  //<!team3>
    }
};

var highlightGroupWithName = function (grpName, color) {
    _.each(data.trajectories, function (traj, id) {
        //change this to high or low
        // if (traj.teams.indexOf(grpName) > -1)
        //     highlightBehaviorNodeIndex(id, color);
    });
};

// Highlights behavior ndoe by index, used in the Highlight panel
function highlightBehaviorNodeIndex(index, color) {
    highlightTraj(data.trajectories[index], color);
    highlightBehaviorNode(index, color);
    displayInfo(data.trajectories[index], index);
    displayingFreq = true;
}

// Highlights behavior ndoe by direct selection, used in the Highlight panel
function highlightBehaviorNode(nodeToHighlight, color) {
    d3.select("#behaviornode" + nodeToHighlight).style("stroke-opacity", 1)
        .style("stroke", color)
        .style("fill", color)
        .style("fill-opacity", 1)
    // somehow have to set fill for cirle only.
    d3.select("#behaviornode" + nodeToHighlight).select("circle")
        .style("stroke", color)
        .style("fill", color);
}

// Highlight Kth trajectories, used in the Highlight panel
function toggleKthTrajectories() {
    clearHighlight();
    applyOpacity(lowestOpacity);
    var numHighlight = parseInt(d3.select("#number-highlight").node().value);
    if (data.hasOwnProperty('trajectories') && numHighlight <= data.trajectories.length) {
        numFrequent = (numHighlight - 1 + data.trajectories.length) % data.trajectories.length;
        highlightBehaviorNodeIndex(numFrequent, fill(numFrequent));
    }
}

// Highlight most frequent trajectories, used in the Highlight panel
function toggleHighlightFreqTrajectories() {
    clearHighlight();
    var numHighlight = parseInt(d3.select("#number-highlight").node().value);
    if (data.hasOwnProperty('trajectories') && numHighlight <= data.trajectories.length) {
        applyOpacity(lowestOpacity);
        numFrequent = numHighlight;
        var bNodeArray = _.range(numFrequent);
        _.each(bNodeArray, function (d) {
            highlightBehaviorNodeIndex(d, fill(d));
        });
    }
}

// Highlights trajectories by direct selection, used in Highlight panel
function highlightTraj(trajString, color) {
    // 1. break the trajectory into nodes and statelinks ID
    ids = trajToIDs(trajString);

    // 2. assign the color to a corresponding list of colors.
    d3.selectAll(ids)
        .style("stroke", color)
        .style("stroke-opacity", 1);

    d3.selectAll(ids).select("circle")
        .style("fill-opacity", 1);

    d3.selectAll(ids).select("text")
        .style("fill", 'black')
        //            .style("fill", color)
        .style("fill-opacity", 1);
}


// return: "#statenode975, #statelink975_0, #statenode1015, #statelink1015_0, #statenode475 "
// for "975, 0, 1015, 1015_0, 475"
var trajToIDs = function (traj) {
    pArray = traj.trajectory;
    selectArray = "";
    for (var i = 0; i < pArray.length; i++) {
        selectArray += "#statenode" + pArray[i];
        if (i < pArray.length - 1) {
            selectArray += ", ";
            selectArray += "#statelink" + pArray[i] + "_" + pArray[i + 1] + ", ";
        }
    }
    return selectArray;
};

// Manipulate opacity, user controlled in both Sequence and State Graphs
var currentOpacity = 0.7;
function incrementOpacity() {
    currentOpacity = currentOpacity + 0.1;
    if (currentOpacity > 1) currentOpacity = 1;
    applyOpacity(currentOpacity);
}

// Manipulate opacity, user controlled in both Sequence and State Graphs
function decrementOpacity() {
    currentOpacity = currentOpacity - 0.1;
    if (currentOpacity < 0.2) currentOpacity = 0.2;
    applyOpacity(currentOpacity);
}

// Manipulate opacity, user controlled in both Sequence and State Graphs
function applyOpacity(opacityValue) {
    d3.selectAll(".statelink,.statenode,.behaviorlink,.behaviornode")
        .style("stroke-opacity", opacityValue)
        .style("fill-opacity", opacityValue);
}

// Manipulate layout, user controlled in both Sequence and State Graphs
var freezeLayout = function () {
    // still moving
    if (behaviorforce.alpha() > 0) {
        stateforce.stop();
        behaviorforce.stop();
    } else {
        stateforce.resume();
        behaviorforce.resume();
    }
}

var allCurrentlyFixed = false;
var fixLayout = function () {
    allCurrentlyFixed = !allCurrentlyFixed;
    d3.selectAll(".statenode,.behaviornode")
        .classed("fixed", function (d) {
            d.fixed = allCurrentlyFixed;
        });
}

// Manipulate opacity, user controlled in both Sequence and State Graphs
var incrementGraph = function (forceChoice) {
    var force = stateforce;
    if (forceChoice > 0)
        force = behaviorforce;
    var currentCharge = force.charge();
    force.charge(currentCharge * 1.5).start();
};

// Manipulate opacity, user controlled in both Sequence and State Graphs
var decrementGraph = function (forceChoice) {
    var force = stateforce;
    if (forceChoice > 0)
        force = behaviorforce;
    var currentCharge = force.charge();
    force.charge(currentCharge * 0.7).start();
};

// Open and close highlight panel, vanilla javascript
function toggleHighlightPanel() {
    let panel = document.getElementById('highlight-controls')
    let title = document.getElementById('highlight-title')
    let button = document.getElementById('highlight-button')
    let icon = document.getElementById('highlight-button-icon')
    if (panel.classList.contains('highlight-open')) {
        panel.classList.remove('highlight-open')
        panel.classList.add('highlight-closed')
        title.classList.remove('highlight-title-inactive')
        title.classList.add('highlight-title-active')
        button.classList.add('highlight-button-closed')
        icon.classList.remove('highlight-button-icon-closed')
    } else {
        panel.classList.remove('highlight-closed')
        panel.classList.add('highlight-open')
        title.classList.remove('highlight-title-active')
        title.classList.add('highlight-title-inactive')
        button.classList.remove('highlight-button-closed')
        icon.classList.add('highlight-button-icon-closed')
    }
}

function activateCompleteSequence() {
    let complete = document.getElementById('complete-sequence-container')
    if (!complete.classList.contains('complete-sequence-active')) {
        complete.classList.add('complete-sequence-active')
    }
}