const default_plot_parameters = {
	height_px: 500, // Pixel height of the svg
	width_px: 700, // Pixel width of the svg
	grid_spacing_px: 10, // Spacing between grid lines in pixels
	grid_thick: 0.5, // Thickness of the grid lines
	axis_thick: 5, // Thickness of the axis
	yoffset_px: 50, // Offset of y axis from the far left edge in px
	xoffset_px: 50, // Offset of x axis from the bottom in px
};

/**
  Var data = [
    { name: "foo", count: 500 },
    { name: "bar", count: 100 },
    { n520-519-4747ame: "baz", count: 300 },
    { name: "qux", count: 400 },
  ];
 */
function draw_horizontal_bars(data) {
	const maxCount = Math.max(...data.map(item => item.count));
	const chart = document.createElement('div');

	for (const item of data) {
		const barContainer = document.createElement('div');
		barContainer.className = 'bar-container';

		const label = document.createElement('div');
		label.className = 'bar-label';
		label.textContent = item.name;

		const bar = document.createElement('div');
		bar.className = 'bar';

		const barWidthPercent = (item.count / maxCount) * 70;
		bar.style.width = barWidthPercent + '%';

		const countLabel = document.createElement('div');
		countLabel.className = 'count-label';
		countLabel.textContent = item.count;

		barContainer.append(label);
		barContainer.append(bar);
		barContainer.append(countLabel);

		chart.append(barContainer);
	}

	return chart;
}

/**
 * ASSUMES x, y > 0
 * @param data looks like:
 * {
 *    datasets : [
 *      { label: "str1", points : [1, 2, null, 3] }
 *      { label: "str2", points : [1, 2, 3, 5] }
 *      ...
 *    ],
 *    xlabels = ["foo", "bar", "biz", "buz"]
 * }
 *
 * @returns An HTMLElement svg. It hasn't been added to the document yet
 */
function draw_line_chart(data, xlabel, ylabel, p) {
	// Find the maximum bar height
	const barspacing_px = 100;
	const svg = draw_grid_with_axis_and_labels(xlabel, ylabel, p);
	draw_lines(svg, data, p.yoffset_px, p.xoffset_px, barspacing_px, true);
	return svg;
}

function generate_legend(svg, labels, colors, x, y) {
	const legend_group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	const rect_size = 15;
	const padding = 5;

	for (const [index, label] of labels.entries()) {
		const color = colors[index];

		const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		rect.setAttribute('x', x);
		rect.setAttribute('y', y + index * (rect_size + padding));
		rect.setAttribute('width', rect_size);
		rect.setAttribute('height', rect_size);
		rect.setAttribute('fill', color);

		const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		text.setAttribute('x', x + rect_size + padding);
		text.setAttribute('y', y + (index * (rect_size + padding)) + rect_size - 3);
		text.setAttribute('font-size', '12px');
		text.setAttribute('fill', 'black');
		text.textContent = label;

		legend_group.append(rect);
		legend_group.append(text);
	}

	svg.append(legend_group);
}

function draw_lines(svg, data, y_offset_px, x_offset_px) {
	const height = Number.parseInt(svg.getAttribute('height'), 10);
	const width = Number.parseInt(svg.getAttribute('width'), 10);

	const x_left_pad = 0.2;
	const x_right_pad = 0.3;

	const max_x = data.xlabels.length - 1 + x_left_pad + x_right_pad;
	const max_y = data.datasets.reduce((max, dataset) => {
		const dataset_max = dataset.points.reduce((_max, value) =>
			(value != null && value > _max) ? value : _max, 0);
		return dataset_max > max ? dataset_max : max;
	}, 0) + 1;

	const x_step = (width - y_offset_px) / max_x;
	const y_step = (height - x_offset_px) / max_y;

	const colors = generate_unique_colors(data.datasets.length);

	for (const [i, dataset] of data.datasets.entries()) {
		let previous_x = null;
		let previous_y = null;
		for (const [index, point_value] of dataset.points.entries()) {
			if (point_value != null) {
				const x = (index + x_left_pad) * x_step + y_offset_px;
				const y = height - x_offset_px - point_value * y_step;
				draw_point(svg, x, y, 5, colors[i]);

				const label_y = y - 10;
				draw_text(svg, point_value, x, label_y, 'middle', 'bottom');

				if (previous_x !== null) {
					draw_line(svg, previous_x, x, previous_y, y, 3, colors[i]);
				}

				previous_x = x;
				previous_y = y;
			}
		}
	}

	for (const [i, label] of data.xlabels.entries()) {
		const x = (i + x_left_pad) * x_step + y_offset_px;
		const y = height - x_offset_px;
		draw_text_rot(svg, label, x, y + 5, 'start', 'hanging', `rotate(20 ${x} ${y})`);
	}

	position_legend(svg, data.datasets.map(d => d.label),
		colors, y_offset_px, x_offset_px);
}

function position_legend(svg, labels, colors, y_offset_px, x_offset_px) {
	const height = svg.getAttribute('height');
	const width = svg.getAttribute('width');

	const legend_padding = 10;
	const rect_size = 15;
	const item_height = rect_size + 5;
	const legend_height = labels.length * item_height;
	const legend_width = 100;

	// Avail space outside the plot area
	const plot_width = width - y_offset_px - legend_padding;
	const plot_height = height - x_offset_px - legend_padding;

	// Right of the plot if space allows
	let legend_x = y_offset_px + plot_width + legend_padding;
	let legend_y = y_offset_px;

	if (legend_x + legend_width > width) {
		// Not enough space on the right, place legend below the plot
		legend_x = y_offset_px;
		legend_y = y_offset_px + plot_height + legend_padding;
	}

	if (legend_y + legend_height > height) {
		// Not enough space below, adjust to top-left corner inside the plot area
		legend_x = y_offset_px + legend_padding;
		legend_y = y_offset_px + legend_padding;
	}

	generate_legend(svg, labels, colors, legend_x, legend_y);
}

function generate_unique_colors(n) {
	const colors = [];
	for (let i = 0; i < n; i++) {
		const hue = i * (360 / n) + 40;
		colors.push(`hsl(${hue}, 60%, 40%)`);
	}

	return colors;
}

/**
 * ASSUMES y > 0
 * @param data looks like:
 * [
 *    { label: "str1", num: 123 }
 *    { label: "str2", num: 456 }
 * ]
 *
 * @returns An HTMLElement svg. It hasn't been added to the document yet
 */
function draw_bar_chart(data, xlabel, ylabel, p = default_plot_parameters) {
	// Find the maximum bar height
	const barspacing_px = 100;
	const svg = draw_grid_with_axis_and_labels(xlabel, ylabel, p);
	draw_bars(svg, data, p.yoffset_px, p.xoffset_px, barspacing_px, true);
	return svg;
}

function draw_bars(
	svg, data,
	yoffset_px, xoffset_px, barspacing_px,
	display_number_above_bar, bar_filter, bar_gradient,
) {
	const height = svg.getAttribute('height');
	const width = svg.getAttribute('width');

	const max_count = data.reduce((max, object) =>
		object.num > max ? object.num : max, 0);
	const yheight = height - xoffset_px;

	// Units per pixel
	const ystep = Math.ceil(max_count / (yheight - 50)); // 50 arbitrary buffer for top

	// The width of the column
	const colwidth = (width - yoffset_px - barspacing_px) / (data.length) - barspacing_px;

	for (const [i, bar] of data.entries()) {
		// Map data point to grid len
		const data_height = bar.num / ystep;

		// 1 gstate.yoffset_px on the left +
		// 1 barspace on the left +
		// i * (colwidth + barspacing_px)
		const x = barspacing_px + yoffset_px + i * (colwidth + barspacing_px);
		const y = height - xoffset_px - data_height;
		const rect = draw_rect(svg, x, y, colwidth, data_height);

		// Add gradients if they exist
		if (bar_filter) {
			set_elem_filter(rect, bar_filter);
		}

		if (bar_gradient) {
			set_elem_gradient(rect, bar_gradient);
		}

		// Add a label to the top of the graph
		draw_text(svg, bar.label,
			x + colwidth / 2, height - xoffset_px + 10, // 10 arbitrary
			x_text_types.centered, y_text_types.top);

		if (display_number_above_bar) {
			draw_text(svg,
				bar.num,
				x + colwidth / 2,
				(height - xoffset_px) - data_height - 10, // 10 arbitrary
				x_text_types.centered,
				y_text_types.bottom);
		}
	}
}

function draw_grid_with_axis_and_labels(xlabel, ylabel, p = default_plot_parameters) {
	const svg = create_svg('main_graph', p.width_px, p.height_px);

	// Draw axis
	draw_xaxis(svg, p.xoffset_px, p.axis_thick);
	draw_yaxis(svg, p.yoffset_px, p.axis_thick);

	// Draw grids
	draw_horizontal_gridlines(svg, p.xoffset_px, p.grid_spacing_px, p.grid_thick);
	draw_vertical_gridlines(svg, p.yoffset_px, p.grid_spacing_px, p.grid_thick);

	// Draw labels
	if (xlabel) {
		draw_xaxis_label(svg, p.yoffset_px, xlabel);
	}

	if (ylabel) {
		draw_yaxis_label(svg, p.xoffset_px, ylabel);
	}

	return svg;
}

/**
 * Writes x axis label [label_str] underneath the x axis.
 * Writes is assuming the y axis is [ax_offset_px] pixels
 * from the left of the svg screen (so that the label is
 * in the middle of [0, max]
 */
function draw_xaxis_label(svg, y_offset_px, label_string) {
	const height = svg.getAttribute('height');
	const width = svg.getAttribute('width');

	draw_text(svg,
		label_string,
		y_offset_px + (width - y_offset_px) / 2,
		height - 5,
		x_text_types.centered,
		y_text_types.bottom);
}

/**
 * Writes y axis label [label_str] to the left of the y axis.
 * Writes is assuming the x axis is [ax_offset_px] pixels
 * from the bottom of the svg screen (so that the label is
 * in the middle of [0, max]
 */
function draw_yaxis_label(svg, x_offset_px, label_string) {
	const height = svg.getAttribute('height');

	const x = 5;
	const y = (height - x_offset_px) / 2;
	draw_text_rot(svg,
		label_string,
		x, y,
		x_text_types.centered,
		y_text_types.top,
		`rotate(-90 ${x} ${y})`,
	);
}

function draw_horizontal_gridlines(svg, xoffset_px, grid_spacing_px, grid_thick) {
	const height = svg.getAttribute('height');

	// Grid rows above xoffset_px
	for (let y = height - xoffset_px; y > 0; y -= grid_spacing_px) {
		draw_x_line(svg, y, grid_thick);
	}

	// Grid rows underneath xoffset_px
	for (let y = height - xoffset_px + grid_spacing_px; y < height; y += grid_spacing_px) {
		draw_x_line(svg, y, grid_thick);
	}
}

function draw_vertical_gridlines(svg, yoffset_px, grid_spacing_px, grid_thick) {
	const width = svg.getAttribute('width');

	// Grid cols to the right of yoffset_px
	for (let x = yoffset_px; x < width; x += grid_spacing_px) {
		draw_y_line(svg, x, grid_thick);
	}

	// Grid cols to the left of yoffset_px
	for (let x = yoffset_px - grid_spacing_px; x > 0; x -= grid_spacing_px) {
		draw_y_line(svg, x, grid_thick);
	}
}

function draw_xaxis(svg, xoffset_px, axis_thick) {
	const height = svg.getAttribute('height');
	const width = svg.getAttribute('width');

	// Horizontal Axis
	draw_line(svg,
		0, width,
		height - xoffset_px, height - xoffset_px,
		axis_thick);
}

function draw_yaxis(svg, yoffset_px, axis_thick) {
	const height = svg.getAttribute('height');

	// Vertical Axis
	draw_line(svg,
		yoffset_px, yoffset_px,
		0, height,
		axis_thick);
}

/// ////////////////////////////////////////
/// ///////// Section: Simple SVG Utils

// Adds a line in svg with thickness
function draw_line(svg, x1, x2, y1, y2, thickness, stroke = 'black') {
	const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
	line.setAttribute('x1', x1);
	line.setAttribute('x2', x2);
	line.setAttribute('y1', y1);
	line.setAttribute('y2', y2);
	line.setAttribute('stroke', stroke);
	line.setAttribute('stroke-width', thickness);
	svg.append(line);
	return line;
}

// Adds a line in svg with thickness
function draw_point(svg, x, y, radius = 5, color = 'black') {
	const line = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
	line.setAttribute('cx', x);
	line.setAttribute('cy', y);
	line.setAttribute('r', radius);
	line.setAttribute('fill', color);
	svg.append(line);
	return line;
}

// Types of text alignments - left right top bottom
const x_text_types = {
	centered: 'middle',
	left: 'start',
	right: 'end',
};
const y_text_types = {
	centered: 'middle',
	top: 'hanging',
	bottom: 'text-bottom',
};

function draw_text(svg, inner_text, x0, y0, xtype, ytype) {
	const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
	text.setAttribute('x', x0);
	text.setAttribute('y', y0);
	text.setAttribute('text-anchor', xtype);
	text.setAttribute('dominant-baseline', ytype);
	text.innerHTML = inner_text;
	svg.append(text);
	return text;
}

function draw_text_rot(svg, inner_text, x0, y0, xtype, ytype, targ) {
	const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
	text.setAttribute('x', x0);
	text.setAttribute('y', y0);
	text.setAttribute('text-anchor', xtype);
	text.setAttribute('dominant-baseline', ytype);
	text.setAttribute('transform', targ);
	text.innerHTML = inner_text;
	svg.append(text);
	return text;
}

function draw_x_line(svg, yloc, thickness) {
	const width = svg.getAttribute('width');
	return draw_line(svg, 0, width, yloc, yloc, thickness);
}

function draw_y_line(svg, xloc, thickness) {
	const height = svg.getAttribute('height');
	return draw_line(svg, xloc, xloc, 0, height, thickness);
}

function draw_rect(svg, x, y, w, h) {
	const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
	rect.setAttribute('x', x);
	rect.setAttribute('y', y);
	rect.setAttribute('width', w);
	rect.setAttribute('height', h);
	rect.setAttribute('stroke', 'black');
	svg.append(rect);
	return rect;
}

function create_svg(id, width, height) {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('width', width);
	svg.setAttribute('height', height);
	svg.setAttribute('id', id);
	return svg;
}

class HorizontalBars extends HTMLElement {
	constructor() {
		super();
		this.data = [];
	}

	setData(data) {
		this.data = data;
		this.render();
	}

	connectedCallback() {
		this.shadow = this.attachShadow({mode: 'open'});
		this.sheet = new CSSStyleSheet();
		this.sheet.replaceSync(`
         #chart {
          width: 100%;
        }

        .bar-container {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          width: 100%;
        }

        .bar-label {
          width: 20%;
          font-weight: bold;
        }

        .bar {
          height: 20px;
          background-color: steelblue;
          cursor: pointer; /* Change cursor to pointer on hover */
          transition: all 0.2s;
        }

        .bar:hover {
          height: 25px; /* Increase height when hovered */
          background-color: darkblue; /* Change color on hover */
        }

        .count-label {
          width: 10%;
          text-align: left;
          padding-left: 5px;
        } `);
		this.shadow.adoptedStyleSheets = [this.sheet];
		this.render();
	}

	render() {
		const element = draw_horizontal_bars(this.data);
		this.shadow.innerHTML = '';
		this.shadow.append(element);
	}
}

class LineChart extends HTMLElement {
	constructor() {
		super();
		this.data = {
			datasets: [],
			xlabels: [],
		};
	}

	setData(data, xlabel, ylabel) {
		this.data = data;
		this.xlabel = xlabel;
		this.ylabel = ylabel;
		this.render();
	}

	connectedCallback() {
		this.shadow = this.attachShadow({mode: 'open'});
		this.render();
	}

	render() {
		const element = draw_line_chart(this.data, this.xlabel, this.ylabel, default_plot_parameters);
		this.shadow.innerHTML = '';
		this.shadow.append(element);
	}
}

class BarChart extends HTMLElement {
	constructor() {
		super();
		this.data = [];
	}

	setData(data, xlabel, ylabel) {
		this.data = data;
		this.xlabel = xlabel;
		this.ylabel = ylabel;
		this.render();
	}

	connectedCallback() {
		this.shadow = this.attachShadow({mode: 'open'});
		this.render();
	}

	render() {
		const element = draw_bar_chart(this.data, this.xlabel, this.ylabel, default_plot_parameters);
		this.shadow.innerHTML = '';
		this.shadow.append(element);
	}
}

customElements.define('horizontal-bars', HorizontalBars);
customElements.define('bar-chart', BarChart);
customElements.define('line-chart', LineChart);
