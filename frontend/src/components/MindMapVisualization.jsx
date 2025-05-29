import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { Add, Remove, CenterFocusStrong, Fullscreen } from '@mui/icons-material';
import * as d3 from 'd3';

const MindMapVisualization = ({ data, onNodeClick }) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const [zoomLevel, setZoomLevel] = useState(1);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });

  useEffect(() => {
    if (!data) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();

    const containerRect = containerRef.current.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;
    const nodeWidth = 200;
    const nodeHeight = 40;

    // Create hierarchy
    const root = d3.hierarchy(data);
    root.x0 = height / 2;
    root.y0 = 0;

    // Collapse all nodes at depth > 1 initially
    root.descendants().forEach(d => {
      if (d.depth > 1) {
        d._children = d.children;
        d.children = null;
      }
    });

    // Set up the SVG container 
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('background-color', '#0d1117')
      .style('border-radius', '8px');

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setTransform(event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);

    const g = svg.append('g')
      .attr('transform', `translate(${width / 6}, ${height / 2})`);

    // Set up the tree layout with more spacing like NotebookLM
    const treeLayout = d3.tree()
      .nodeSize([nodeHeight * 1.8, nodeWidth * 1.2])
      .separation((a, b) => a.parent === b.parent ? 1.2 : 1.5);

    let i = 0;

    // Toggle function for expanding/collapsing nodes
    function toggleNode(d) {
      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
      update(d);
    }

    // Generate a question from node path
    function formQuestion(d) {
      const ancestors = d.ancestors().reverse();
      const path = ancestors.map(n => n.data.name).join(' > ');
      const questionText = 'Tell me about ' + path;
      
      if (onNodeClick) {
        onNodeClick(path, questionText);
      }
    }

    // Create a curved path between two points (NotebookLM style)
    function diagonal(s, d) {
      const path = `M ${s.y} ${s.x}
                    C ${s.y + (d.y - s.y) * 0.6} ${s.x},
                      ${s.y + (d.y - s.y) * 0.4} ${d.x},
                      ${d.y} ${d.x}`;
      return path;
    }

    // Update the visualization
    function update(source) {
      // Apply tree layout
      const tree = treeLayout(root);
      
      // Get nodes and links
      const nodes = tree.descendants();
      const links = tree.links();
      
      // Normalize for fixed-depth spacing
      nodes.forEach(d => {
        d.y = d.depth * 250; // Increased spacing like NotebookLM
      });
      
      // NotebookLM-style color scheme
      const nodeColors = {
        0: '#58a6ff', // Root - blue
        1: '#7ee787', // Level 1 - green
        2: '#f9826c', // Level 2 - orange
        3: '#d2a8ff', // Level 3 - purple
        4: '#ffd60a', // Level 4 - yellow
        default: '#8b949e' // Default - gray
      };

      const linkColors = {
        0: '#21262d',
        1: '#30363d',
        2: '#424a53',
        3: '#545d68',
        default: '#656c76'
      };
      
      // ************ Nodes section ************
      
      const node = g.selectAll('.node')
        .data(nodes, d => d.id || (d.id = ++i));
        
      // Enter new nodes
      const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${source.y0},${source.x0})`)
        .style('opacity', 0);
      
      // Add node containers with NotebookLM styling
      nodeEnter.append('rect')
        .attr('class', 'node-box')
        .attr('width', d => Math.min(d.data.name.length * 10 + 40, nodeWidth))
        .attr('height', nodeHeight)
        .attr('x', 0)
        .attr('y', -nodeHeight / 2)
        .attr('fill', d => nodeColors[d.depth] || nodeColors.default)
        .attr('stroke', '#30363d')
        .attr('stroke-width', 1)
        .attr('rx', 8)
        .attr('ry', 8)
        .style('cursor', 'pointer')
        .style('filter', 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))')
        .on('click', function(event, d) {
          event.stopPropagation();
          formQuestion(d);
        })
        .on('mouseover', function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('fill', d3.color(nodeColors[d.depth] || nodeColors.default).brighter(0.3));
        })
        .on('mouseout', function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('fill', nodeColors[d.depth] || nodeColors.default);
        });
      
      // Add text labels with better typography
      nodeEnter.append('text')
        .attr('class', 'node-text')
        .attr('x', 20)
        .attr('y', 5)
        .attr('fill', '#0d1117')
        .attr('font-size', '13px')
        .attr('font-weight', '500')
        .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
        .style('pointer-events', 'none')
        .text(d => {
          const maxLength = Math.floor((nodeWidth - 40) / 8);
          return d.data.name.length > maxLength ? 
            d.data.name.substring(0, maxLength - 3) + '...' : 
            d.data.name;
        });
      
      // Add expand/collapse buttons with NotebookLM style
      const toggleGroup = nodeEnter.filter(d => d._children || d.children)
        .append('g')
        .attr('class', 'toggle-group')
        .attr('transform', d => {
          const width = Math.min(d.data.name.length * 10 + 40, nodeWidth);
          return `translate(${width + 15}, 0)`;
        })
        .style('cursor', 'pointer')
        .on('click', function(event, d) {
          event.stopPropagation();
          toggleNode(d);
        });
      
      toggleGroup.append('circle')
        .attr('r', 12)
        .attr('fill', '#21262d')
        .attr('stroke', '#58a6ff')
        .attr('stroke-width', 2)
        .style('filter', 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))');
        
      toggleGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', '#58a6ff')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .text(d => d.children ? '−' : '+');
      
      // Transition nodes to their new positions
      const nodeUpdate = nodeEnter.merge(node);
      
      nodeUpdate.transition()
        .duration(500)
        .ease(d3.easeCubicOut)
        .attr('transform', d => `translate(${d.y},${d.x})`)
        .style('opacity', 1);
        
      // Update toggle button text
      nodeUpdate.select('text:last-child')
        .text(d => d.children ? '−' : '+');
        
      // Remove exiting nodes
      const nodeExit = node.exit().transition()
        .duration(300)
        .attr('transform', d => `translate(${source.y},${source.x})`)
        .style('opacity', 0)
        .remove();
      
      // ************ Links section ************
      
      const link = g.selectAll('.link')
        .data(links, d => d.target.id);
        
      // Enter new links
      const linkEnter = link.enter().insert('path', 'g')
        .attr('class', 'link')
        .attr('d', d => {
          const o = {x: source.x0, y: source.y0};
          return diagonal(o, o);
        })
        .attr('fill', 'none')
        .attr('stroke', d => linkColors[d.source.depth] || linkColors.default)
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', 2)
        .style('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))');
        
      // Transition links to their new position
      link.merge(linkEnter).transition()
        .duration(500)
        .ease(d3.easeCubicOut)
        .attr('d', d => diagonal(d.source, d.target))
        .attr('stroke', d => linkColors[d.source.depth] || linkColors.default);
        
      // Remove exiting links
      link.exit().transition()
        .duration(300)
        .attr('d', d => {
          const o = {x: source.x, y: source.y};
          return diagonal(o, o);
        })
        .remove();
        
      // Store the old positions for transition
      nodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    }

    // Store zoom and center functions for external controls
    window.mindMapZoom = {
      zoomIn: () => {
        svg.transition().duration(300).call(
          zoom.scaleBy, 1.3
        );
      },
      zoomOut: () => {
        svg.transition().duration(300).call(
          zoom.scaleBy, 1 / 1.3
        );
      },
      center: () => {
        svg.transition().duration(500).call(
          zoom.transform,
          d3.zoomIdentity.translate(width / 6, height / 2).scale(1)
        );
      },
      fitToScreen: () => {
        const bounds = g.node().getBBox();
        const fullWidth = width;
        const fullHeight = height;
        const widthScale = fullWidth / bounds.width;
        const heightScale = fullHeight / bounds.height;
        const scale = Math.min(widthScale, heightScale) * 0.8;
        const translate = [
          fullWidth / 2 - scale * (bounds.x + bounds.width / 2),
          fullHeight / 2 - scale * (bounds.y + bounds.height / 2)
        ];
        
        svg.transition().duration(750).call(
          zoom.transform,
          d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        );
      }
    };

    // Initial update
    update(root);

    // Handle resize
    const handleResize = () => {
      const newRect = containerRef.current.getBoundingClientRect();
      svg.attr('width', newRect.width).attr('height', newRect.height);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      delete window.mindMapZoom;
    };

  }, [data, onNodeClick]);

  const handleZoomIn = () => {
    if (window.mindMapZoom) window.mindMapZoom.zoomIn();
  };

  const handleZoomOut = () => {
    if (window.mindMapZoom) window.mindMapZoom.zoomOut();
  };

  const handleCenter = () => {
    if (window.mindMapZoom) window.mindMapZoom.center();
  };

  const handleFitToScreen = () => {
    if (window.mindMapZoom) window.mindMapZoom.fitToScreen();
  };

  return (
    <Box sx={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%',
      backgroundColor: '#0d1117'
    }} ref={containerRef}>
      {/* NotebookLM-style zoom controls */}
      <Box sx={{ 
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        backgroundColor: '#21262d',
        borderRadius: '8px',
        border: '1px solid #30363d',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}>
        <IconButton
          onClick={handleZoomIn}
          size="small"
          sx={{ 
            color: '#f0f6fc',
            borderRadius: 0,
            '&:hover': { 
              backgroundColor: '#30363d',
              color: '#58a6ff'
            }
          }}
        >
          <Add fontSize="small" />
        </IconButton>
        
        <Box sx={{ 
          px: 2,
          py: 0.5,
          backgroundColor: '#161b22',
          borderTop: '1px solid #30363d',
          borderBottom: '1px solid #30363d'
        }}>
          <Typography variant="caption" sx={{ 
            color: '#8b949e',
            fontSize: '11px',
            fontFamily: 'Monaco, Consolas, monospace'
          }}>
            {Math.round(zoomLevel * 100)}%
          </Typography>
        </Box>
        
        <IconButton
          onClick={handleZoomOut}
          size="small"
          sx={{ 
            color: '#f0f6fc',
            borderRadius: 0,
            '&:hover': { 
              backgroundColor: '#30363d',
              color: '#58a6ff'
            }
          }}
        >
          <Remove fontSize="small" />
        </IconButton>
      </Box>

      {/* Additional controls */}
      <Box sx={{ 
        position: 'absolute',
        bottom: 16,
        right: 16,
        zIndex: 1000,
        display: 'flex',
        gap: 1
      }}>
        <IconButton
          onClick={handleCenter}
          size="small"
          sx={{ 
            backgroundColor: '#21262d',
            border: '1px solid #30363d',
            color: '#f0f6fc',
            '&:hover': { 
              backgroundColor: '#30363d',
              color: '#58a6ff'
            }
          }}
        >
          <CenterFocusStrong fontSize="small" />
        </IconButton>
        
        <IconButton
          onClick={handleFitToScreen}
          size="small"
          sx={{ 
            backgroundColor: '#21262d',
            border: '1px solid #30363d',
            color: '#f0f6fc',
            '&:hover': { 
              backgroundColor: '#30363d',
              color: '#58a6ff'
            }
          }}
        >
          <Fullscreen fontSize="small" />
        </IconButton>
      </Box>

      {/* Mind map SVG */}
      <svg 
        ref={svgRef}
        style={{ 
          width: '100%', 
          height: '100%',
          cursor: 'grab'
        }}
      />
      
      {/* Zoom instructions overlay (appears on first load) */}
      {data && (
        <Box sx={{ 
          position: 'absolute',
          bottom: 16,
          left: 16,
          backgroundColor: 'rgba(33, 38, 45, 0.9)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #30363d',
          borderRadius: '8px',
          p: 2,
          maxWidth: 300
        }}>
          <Typography variant="caption" sx={{ 
            color: '#8b949e',
            display: 'block',
            mb: 0.5
          }}>
            <strong style={{ color: '#f0f6fc' }}>Navigation:</strong>
          </Typography>
          <Typography variant="caption" sx={{ 
            color: '#8b949e',
            fontSize: '11px',
            lineHeight: 1.4
          }}>
            • Click nodes to ask questions<br/>
            • Click + / - to expand/collapse<br/>
            • Drag to pan, scroll to zoom<br/>
            • Use controls to reset view
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MindMapVisualization;