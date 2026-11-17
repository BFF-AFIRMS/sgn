package Shared::Fieldmap;

# Grid cell dimensions and label positioning offsets (in SVG units/pixels)
my $CELL_SIZE                       = 52;
my $CELL_HALF                       = 25;
my $LABEL_Y_OFFSET                  = 30;
my $LABEL_Y_OFFSET_STAGGERED_TOP    = 20;
my $LABEL_Y_OFFSET_STAGGERED_BOTTOM = 40;

# Axis layout offsets relative to grid bounds
my $X_VAL_TOP_OFFSET_Y    = -10;
my $X_VAL_BOTTOM_OFFSET_Y = 20;
my $Y_VAL_LEFT_OFFSET_X   = -20;
my $Y_VAL_RIGHT_OFFSET_X  = 20;

# Secondary axis layout offsets relative to grid bounds
my $SEC_X_LABEL_TOP_OFFSET_Y    = -42;
my $SEC_X_LABEL_BOTTOM_OFFSET_Y = 52;
my $SEC_Y_LABEL_LEFT_OFFSET_X   = -60;
my $SEC_Y_LABEL_RIGHT_OFFSET_X  = 60;
my $SEC_X_VAL_TOP_OFFSET_Y      = -26;
my $SEC_X_VAL_BOTTOM_OFFSET_Y   = 36;
my $SEC_Y_VAL_LEFT_OFFSET_X     = -40;
my $SEC_Y_VAL_RIGHT_OFFSET_X    = 40;

# Plot fill colors
my $border_fill     = '#ecefef';
my $even_block_fill = '#c7e9b4';
my $odd_block_fill  = '#41b6c4';
my $check_fill      = '#6a5acd';
my $overlap_fill    = '#000000';
my $overlap_stroke  = '#ff0000';
my @palette = (
	'#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3',
	'#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd',
	'#ccebc5', '#ffed6f'
);

# -----------------------------------------------------------------------------
# SVG & Field Map Helper Functions
# -----------------------------------------------------------------------------

# Dispatch synthetic MouseEvents with client coordinates to an element found via XPath
sub _dispatch_mouse_events {
	my ($xpath, @events) = @_;
	$t->driver->execute_script(q{
		const el = document.evaluate(arguments[0], document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
		if (!el) return;
		const target = el.querySelector('rect') || el;
		const b = target.getBoundingClientRect();
		const clientX = b.left + b.width / 2;
		const clientY = b.top + b.height / 2;
		for (const evt of arguments[1]) {
			target.dispatchEvent(new MouseEvent(evt, { clientX: clientX, clientY: clientY, bubbles: true }));
		}
	}, $xpath, \@events);
}

# Find an SVG <text> element matching the given text, optional (x, y) coordinates, and font-size
sub find_svg_text_ok {
	my ($text, $x, $y, $font_size) = @_;

	my $xpath = '//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="' . $text . '"';
	$xpath .= ' and @x="' . $x . '" and @y="' . $y . '"' if (defined $x && defined $y);
	$xpath .= ' and @font-size="' . $font_size . '"' if defined $font_size;
	$xpath .= ']';

	my $desc = "Find text element '$text'";
	$desc .= " at ($x,$y)" if (defined $x && defined $y);
	$desc .= " with font size $font_size" if defined $font_size;

	return $t->find_element_ok($xpath, 'xpath', $desc);
}

# Find a plot cell <rect> in the SVG by translated pixel coordinates and optional fill color
sub find_svg_square_ok {
	my ($x, $y, $fill) = @_;
	my $xpath = defined $fill ? 
		'//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="g" and @transform="translate(' . $x . ', ' . $y . ')"]/*[local-name()="rect" and @fill="' . $fill . '"]' : 
		'//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="g" and @transform="translate(' . $x . ', ' . $y . ')"]';
	return $t->find_element_ok($xpath, 'xpath', "Find plot square at ($x,$y)" . (defined $fill ? " with fill '$fill'" : ""));
}

# Click a plot cell <rect> in the SVG by translated pixel coordinates
sub click_svg_square_ok {
	my ($x, $y) = @_;
	my $xpath = '//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="g" and @transform="translate(' . $x . ', ' . $y . ')"]/*[local-name()="rect"]';
	return $t->click_ok($xpath, 'xpath', "Click plot square at ($x,$y)");
}

# Convert grid (col, row) 0-indexed column and row positions into SVG pixel offsets
sub cell_pos {
	my ($col, $row) = @_;
	return ($col * $CELL_SIZE, $row * $CELL_SIZE);
}

# Convenience wrapper to verify a plot cell at grid (col, row) with optional fill color
sub find_plot_cell_ok {
	my ($col, $row, $fill) = @_;
	my ($x, $y) = cell_pos($col, $row);
	return find_svg_square_ok($x, $y, $fill);
}

# Convenience wrapper to click a plot cell at grid (col, row)
sub click_plot_cell_ok {
	my ($col, $row) = @_;
	my ($x, $y) = cell_pos($col, $row);
	return click_svg_square_ok($x, $y);
}

# Dispatch double-click mouse events on a plot cell at grid (col, row)
sub double_click_plot_cell_ok {
	my ($col, $row) = @_;
	my $xpath = plot_cell_xpath($col, $row);
	_dispatch_mouse_events($xpath, 'mousedown', 'mouseup', 'click', 'mousedown', 'mouseup', 'click', 'dblclick');
}

# Convenience wrapper to verify an overlapping plot cell at grid (col, row)
sub find_overlapping_cell_ok {
	my ($col, $row) = @_;
	my ($x, $y) = cell_pos($col, $row);
	my $xpath = '//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="g" and @transform="translate(' . $x . ', ' . $y . ')"]/*[local-name()="rect" and @fill="' . $overlap_fill . '" and @stroke="' . $overlap_stroke . '"]';
	return $t->find_element_ok($xpath, 'xpath', "Find overlapping plot square at grid ($col,$row) translated ($x,$y) with black fill and red stroke");
}

# Construct the XPath expression locating the SVG plot cell group at grid (col, row)
sub plot_cell_xpath {
	my ($col, $row) = @_;
	my ($x, $y) = cell_pos($col, $row);
	return '//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="g" and @transform="translate(' . $x . ', ' . $y . ')"]';
}

# Trigger mouse hover events (mouseover, mouseenter) on an element found via XPath
sub hover_element {
	my ($xpath) = @_;
	_dispatch_mouse_events($xpath, 'mouseover', 'mouseenter');
}

# Trigger mouse leave events (mouseout, mouseleave) on an element found via XPath
sub unhover_element {
	my ($xpath) = @_;
	_dispatch_mouse_events($xpath, 'mouseout', 'mouseleave');
}

# Convenience wrapper to trigger mouse hover events on a plot cell at grid (col, row)
sub hover_plot_cell {
	my ($col, $row) = @_;
	hover_element(plot_cell_xpath($col, $row));
}

# Convenience wrapper to trigger mouse leave events on a plot cell at grid (col, row)
sub unhover_plot_cell {
	my ($col, $row) = @_;
	unhover_element(plot_cell_xpath($col, $row));
}

# Issue a synthetic click on an element by dispatching mouse events
sub click_synthetic {
	my ($xpath) = @_;
	_dispatch_mouse_events($xpath, 'mousedown', 'mouseup', 'click');
}

# Verify plot label text at grid (col, row), handling standard or staggered (even/odd col) vertical offsets
sub find_plot_label_ok {
	my ($text, $col, $row, %opts) = @_;
	my $font_size = $opts{font_size};
	my $y_offset = $opts{staggered} ?
		($col % 2 == 0 ? $LABEL_Y_OFFSET_STAGGERED_TOP : $LABEL_Y_OFFSET_STAGGERED_BOTTOM) :
		$LABEL_Y_OFFSET;
	my $x = $col * $CELL_SIZE + $CELL_HALF;
	my $y = $row * $CELL_SIZE + $y_offset;
	return find_svg_text_ok($text, $x, $y, $font_size);
}

# Verify X axis column tick value text at top or bottom
sub find_x_val_ok {
	my ($text, $col, $num_rows, $side) = @_;
	my $x = $col * $CELL_SIZE + $CELL_HALF;
	my $grid_h = defined $num_rows ? $num_rows * $CELL_SIZE : 0;
	my $y = ($side eq 'top') ? $X_VAL_TOP_OFFSET_Y : ($grid_h + $X_VAL_BOTTOM_OFFSET_Y);
	return find_svg_text_ok($text, $x, $y);
}

# Verify Y axis row tick value text at left or right
sub find_y_val_ok {
	my ($text, $row, $num_cols, $side) = @_;
	my $grid_w = defined $num_cols ? $num_cols * $CELL_SIZE : 0;
	my $x = ($side eq 'left') ? $Y_VAL_LEFT_OFFSET_X : ($grid_w + $Y_VAL_RIGHT_OFFSET_X);
	my $y = $row * $CELL_SIZE + $LABEL_Y_OFFSET;
	return find_svg_text_ok($text, $x, $y);
}

# Verify secondary X axis label text (centered horizontally at top or bottom)
sub find_sec_x_label_ok {
	my ($text, $num_cols, $num_rows, $side) = @_;
	my $grid_w = $num_cols * $CELL_SIZE;
	my $grid_h = $num_rows * $CELL_SIZE;
	my $x = $grid_w / 2;
	my $y = ($side eq 'top') ? $SEC_X_LABEL_TOP_OFFSET_Y : ($grid_h + $SEC_X_LABEL_BOTTOM_OFFSET_Y);
	return find_svg_text_ok($text, $x, $y);
}

# Verify secondary Y axis label text (centered vertically at left or right)
sub find_sec_y_label_ok {
	my ($text, $num_cols, $num_rows, $side) = @_;
	my $grid_w = $num_cols * $CELL_SIZE;
	my $grid_h = $num_rows * $CELL_SIZE;
	my $x = ($side eq 'left') ? $SEC_Y_LABEL_LEFT_OFFSET_X : ($grid_w + $SEC_Y_LABEL_RIGHT_OFFSET_X);
	my $y = $grid_h / 2;
	return find_svg_text_ok($text, $x, $y);
}

# Verify secondary X axis column tick value text at top or bottom
sub find_sec_x_val_ok {
	my ($text, $col, $num_rows, $side) = @_;
	my $x = $col * $CELL_SIZE + $CELL_HALF;
	my $grid_h = defined $num_rows ? $num_rows * $CELL_SIZE : 0;
	my $y = ($side eq 'top') ? $SEC_X_VAL_TOP_OFFSET_Y : ($grid_h + $SEC_X_VAL_BOTTOM_OFFSET_Y);
	return find_svg_text_ok($text, $x, $y);
}

# Verify secondary Y axis row tick value text at left or right
sub find_sec_y_val_ok {
	my ($text, $row, $num_cols, $side) = @_;
	my $grid_w = defined $num_cols ? $num_cols * $CELL_SIZE : 0;
	my $x = ($side eq 'left') ? $SEC_Y_VAL_LEFT_OFFSET_X : ($grid_w + $SEC_Y_VAL_RIGHT_OFFSET_X);
	my $y = $row * $CELL_SIZE + $LABEL_Y_OFFSET;
	return find_svg_text_ok($text, $x, $y);
}

# Open the Change Dimensions modal and apply new column and row dimensions
sub set_dimensions {
	my ($columns, $rows, $filler_accession, $preserve_gaps) = @_;
	$t->click_ok('//button[@title="Change Dimensions"]', 'xpath', 'Click Change Dimensions button');
	if (defined $columns) {
		$t->send_keys_ok('//label[contains(text(),"Columns")]/following-sibling::input', 'xpath', $columns, "Set Columns input to $columns", clear => 1);
	}
	if (defined $rows) {
		$t->send_keys_ok('//label[contains(text(),"Rows")]/following-sibling::input', 'xpath', $rows, "Set Rows input to $rows", clear => 1);
	}
	if (defined $filler_accession) {
		$t->send_keys_ok('//div[contains(@class,"show")]//label[contains(text(),"Filler Accession")]/following-sibling::div//input', 'xpath', $filler_accession, "Set Filler Accession input to $filler_accession", clear => 1);
	}
	if (defined $preserve_gaps){
		my $preserve_gaps_xpath = '//label[contains(text(),"Preserve gaps between plots")]/input';
		my $preserve_gaps_selected = $t->find_element($preserve_gaps_xpath, 'xpath', 'Find preserve gaps checkbox')->is_selected();
		if ($preserve_gaps && !$preserve_gaps_selected) {
			$t->click_ok($preserve_gaps_xpath, 'xpath', 'Check Preserve gaps between plots');
		}
		elsif (!$preserve_gaps && $preserve_gaps_selected){
			$t->click_ok($preserve_gaps_xpath, 'xpath', 'Uncheck Preserve gaps between plots');
		}
	}
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Apply")]', 'xpath', 'Click Apply button');
}

# Open the Change Secondary Axis modal and configure labels and comma-separated axis values
sub set_secondary_axis {
	my ($x_label, $y_label, $x_values, $y_values) = @_;
	$t->click_ok('//button[@title="Change Secondary Axis"]', 'xpath', 'Click Change Secondary Axis button');
	$t->send_keys_ok('//label[contains(text(),"Secondary X Axis Label")]/following-sibling::input', 'xpath', $x_label, "Enter new secondary x axis label", clear => 1);
	$t->send_keys_ok('//label[contains(text(),"Secondary Y Axis Label")]/following-sibling::input', 'xpath', $y_label, "Enter new secondary y axis label", clear => 1);
	$t->send_keys_ok('//label[contains(text(),"Secondary X Axis Values")]/following-sibling::input', 'xpath', $x_values, "Enter new secondary x axis values", clear => 1);
	$t->send_keys_ok('//label[contains(text(),"Secondary Y Axis Values")]/following-sibling::input', 'xpath', $y_values, "Enter new secondary y axis values", clear => 1);
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Apply")]', 'xpath', 'Click Apply button');
}

# Open the Change Secondary Axis modal, clear all inputs using clear_ok, and apply
sub clear_secondary_axis {
	$t->click_ok('//button[@title="Change Secondary Axis"]', 'xpath', 'Click Change Secondary Axis button');
	$t->clear_ok('//label[contains(text(),"Secondary X Axis Label")]/following-sibling::input', 'xpath', 'Clear secondary x axis label');
	$t->clear_ok('//label[contains(text(),"Secondary Y Axis Label")]/following-sibling::input', 'xpath', 'Clear secondary y axis label');
	$t->clear_ok('//label[contains(text(),"Secondary X Axis Values")]/following-sibling::input', 'xpath', 'Clear secondary x axis values');
	$t->clear_ok('//label[contains(text(),"Secondary Y Axis Values")]/following-sibling::input', 'xpath', 'Clear secondary y axis values');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Apply")]', 'xpath', 'Click Apply button to clear secondary axis');
}

# Select a view from the "Select Layout View" dropdown (e.g. Field Layout or Assayed Trait)
sub set_layout_view {
	my ($view_option_text_or_value) = @_;
	my $xpath = '//label[contains(text(),"Select Layout View:")]/following-sibling::select//option[normalize-space(text())="' . $view_option_text_or_value . '" or @value="' . $view_option_text_or_value . '"]';
	$t->click_option_ok($xpath, 'xpath', "Select Layout View '$view_option_text_or_value'");
	$t->wait_for_working_dialog();
}

# Select a coloring option from the "Color By:" dropdown
sub set_color_by {
	my ($color_by) = @_;
	$t->click_option_ok('//label[contains(text(),"Color By:")]/following-sibling::select/option[@value="' . $color_by . '"]', 'xpath', "Select Color By '$color_by'");
}

# Select a labeling option from the "Label By:" dropdown
sub set_label_by {
	my ($label_by) = @_;
	$t->click_option_ok('//label[contains(text(),"Label By:")]/following-sibling::select/option[@value="' . $label_by . '"]', 'xpath', "Select Label By '$label_by'");
}

# Set the plot label font size
sub set_label_size {
	my ($size) = @_;
	$t->send_keys_ok('//label[contains(text(),"Label Size:")]/following-sibling::input', 'xpath', $size, "Set Label Size to $size", clear => 1);
}

# Verify that the north arrow compass SVG has the expected rotation angle (in degrees)
sub find_north_arrow_ok {
	my ($rotation) = @_;
	my $xpath = '//*[@id="fieldmap_north_arrow"]//*[local-name()="svg" and contains(@style, "rotate(' . $rotation . 'deg)")]';
	return $t->find_element_ok($xpath, 'xpath', "Find north arrow with rotation $rotation degrees");
}

# Enter a custom north arrow angle (in degrees)
sub set_north_arrow_angle {
	my ($angle) = @_;
	$t->send_keys_ok('//label[contains(text(),"North Angle")]/following-sibling::input', 'xpath', $angle, "Set North Angle to $angle degrees", clear => 1);
}

# Retrieve the current SVG pan (x, y) and zoom scale via browser execution
sub get_svg_transform {
	return $t->driver->execute_script(q{
		const el = document.getElementById(arguments[0]);
		if (!el) return null;
		const style = el.style.transform || el.getAttribute('style') || '';

		let x = 0;
		let y = 0;
		const translateMatch = style.match(/translate\(\s*([-\d\.]+)(?:px)?(?:\s*,\s*([-\d\.]+)(?:px)?)?\s*\)/i);
		if (translateMatch) {
			x = parseFloat(translateMatch[1]) || 0;
			y = translateMatch[2] !== undefined ? (parseFloat(translateMatch[2]) || 0) : 0;
		}

		let zoom = 1;
		const scaleMatch = style.match(/scale\(\s*([-\d\.]+)\s*\)/i);
		if (scaleMatch) {
			zoom = parseFloat(scaleMatch[1]) || 1;
		}

		if (translateMatch || scaleMatch) {
			return { x: x, y: y, zoom: zoom };
		}
		return null;
	}, $svg_id);
}

# Dispatch a synthetic mouse wheel event on the SVG container to simulate zooming
sub mouse_wheel_zoom {
	my ($delta_y) = @_;
	$t->driver->execute_script(q{
		const el = document.getElementById('fieldmap_chart_svg').parentElement;
		const rect = el.getBoundingClientRect();
		const evt = new WheelEvent('wheel', {
			deltaY: arguments[0],
			clientX: rect.left + rect.width / 2,
			clientY: rect.top + rect.height / 2,
			bubbles: true,
			cancelable: true
		});
		el.dispatchEvent(evt);
	}, $delta_y);
}

# Dispatch synthetic mousedown, mousemove, and mouseup events to simulate panning
sub drag_svg {
	my ($dx, $dy) = @_;
	$t->driver->execute_script(q{
		const el = document.getElementById('fieldmap_chart_svg').parentElement;
		const rect = el.getBoundingClientRect();
		const startX = rect.left + 100;
		const startY = rect.top + 100;
		const endX = startX + arguments[0];
		const endY = startY + arguments[1];

		el.dispatchEvent(new MouseEvent('mousedown', { clientX: startX, clientY: startY, button: 0, buttons: 1, bubbles: true }));
		el.dispatchEvent(new MouseEvent('mousemove', { clientX: endX, clientY: endY, button: 0, buttons: 1, bubbles: true }));
		el.dispatchEvent(new MouseEvent('mouseup', { clientX: endX, clientY: endY, button: 0, buttons: 0, bubbles: true }));
	}, $dx, $dy);
}

# Persistent window.open handler that captures URL, features, and stubs win.print()
sub setup_window_open_handler {
	$t->driver->execute_script(q{
		if (!window.__customOpenInstalled) {
			window.__customOpenInstalled = true;
			const realOpen = window.open;
			window.open = function(url, target, features) {
				window.__lastOpenedUrl = url;
				window.__lastOpenedFeatures = features;
				const win = realOpen.call(window, url, target, features);
				if (win) {
					try {
						win.print = function() {
							window.__printCalled = true;
						};
					} catch (e) {}
				}
				return win;
			};
		}
	});
}

# Verify Print Fieldmap button, alert text, print preview window, and print() invocation
sub test_print_field_map_ok {
	my ($expected_title) = @_;
	$expected_title ||= 'Field Map View';

	setup_window_open_handler();
	$t->driver->execute_script(q{
		window.__printCalled = false;
		window.__lastOpenedFeatures = null;
	});

	my $orig_handle = $t->driver->get_current_window_handle();
	my @handles_before = @{$t->driver->get_window_handles()};

	$t->click_ok('//button[@title="Print Fieldmap"]', 'xpath', 'Click Print Fieldmap toolbar button');

	my $alert_text = $t->get_alert_text();
	is(
		$alert_text,
		"You may need to change print settings - such as page size, margins, and scaling - to get the fieldmap to display properly in the print preview. Select \"Background graphics\" to ensure the legend includes colors.",
		'Verify print settings alert text'
	);
	$t->accept_alert_ok('Accept print settings instruction alert');

	# Verify window features passed to window.open
	my $features = $t->driver->execute_script('return window.__lastOpenedFeatures;');
	is($features, 'width=800,height=600', 'Verify window.open called with width=800,height=600');

	# Wait for print preview window to open
	my $has_new_window = eval {
		wait_until {
			scalar(@{$t->driver->get_window_handles()}) > scalar(@handles_before);
		} timeout => 5;
	};
	ok($has_new_window, 'Print preview window was opened');

	if ($has_new_window) {
		my @handles_after = @{$t->driver->get_window_handles()};
		my ($new_handle) = grep { $_ ne $orig_handle } @handles_after;
		if ($new_handle) {
			$t->driver->switch_to_window($new_handle);

			# Verify document title
			ok((wait_until {
				my $title = eval { $t->driver->get_title() };
				return $title && $title eq 'Print Field Map';
			} timeout => 5), 'Print window has title "Print Field Map"');

			# Verify <h1> heading
			$t->find_element_ok(
				'//h1[normalize-space()="' . $expected_title . '"]',
				'xpath',
				"Print window displays expected header '$expected_title'"
			);

			# Verify legend and SVG are present in the print window
			$t->find_element_ok('//*[@id="legend_list"]', 'xpath', 'Print window contains legend list');
			$t->find_element_ok('//*[@id="' . $svg_id . '"]', 'xpath', 'Print window contains fieldmap chart SVG');
			$t->find_element_ok(
				'//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="rect"]',
				'xpath',
				'Print window SVG contains plot rect elements'
			);

			if ($expected_title ne 'Field Map View') {
				$t->find_element_ok(
					'//*[@id="legend_list"]//div[contains(@style,"linear-gradient")]',
					'xpath',
					'Print window contains gradient bar for heatmap'
				);
			}

			# Switch back to orig_handle to verify print() was called
			$t->driver->switch_to_window($orig_handle);
			ok((wait_until {
				$t->driver->execute_script('return !!window.__printCalled;');
			} timeout => 5, interval => 0.2), 'Verify print() was invoked on printWindow');

			# Switch back to new_handle to close it cleanly
			$t->driver->switch_to_window($new_handle);
			$t->driver->close();
			$t->driver->switch_to_window($orig_handle);
		}
	}
}

# Verify Heatmap PNG image download: button click, canvas rasterization, anchor attributes, and file on disk
sub test_download_heatmap_image_ok {
	my ($expected_label) = @_;

	# Clean up any existing heatmap PNG files
	if (opendir(my $dh, $download_dir)) {
		while (my $f = readdir($dh)) {
			if ($f =~ /_heatmap\.png$/) {
				unlink "$download_dir/$f";
			}
		}
		closedir($dh);
	}

	# Intercept HTMLAnchorElement.prototype.click in browser to capture download attributes
	$t->driver->execute_script(q{
		window.__lastHeatmapDownload = null;
		if (!window.__heatmapDownloadSpyInstalled) {
			window.__heatmapDownloadSpyInstalled = true;
			const origClick = HTMLAnchorElement.prototype.click;
			HTMLAnchorElement.prototype.click = function() {
				if (this.download && this.download.indexOf('_heatmap.png') !== -1) {
					window.__lastHeatmapDownload = {
						download: this.download,
						hrefPrefix: this.href ? this.href.substring(0, 30) : '',
						hrefLength: this.href ? this.href.length : 0
					};
				}
				return origClick.apply(this, arguments);
			};
		}
	});

	$t->click_ok(
		'//button[contains(text(),"Download Heatmap Image")]',
		'xpath',
		"Click Download Heatmap Image button for '$expected_label'"
	);

	# Wait for asynchronous image.onload, canvas drawing, and download link click
	ok((wait_until {
		my $info = $t->driver->execute_script('return window.__lastHeatmapDownload;');
		return defined $info && $info->{hrefLength} > 100;
	} timeout => 15, interval => 0.5), "Wait for heatmap image download data to be generated for '$expected_label'");

	my $dl_info = $t->driver->execute_script('return window.__lastHeatmapDownload;');
	is($dl_info->{download}, "${expected_label}_heatmap.png", "Verify download filename attribute is '${expected_label}_heatmap.png'");
	like($dl_info->{hrefPrefix}, qr{^data:image/png;base64,}, 'Verify download data URL has image/png base64 prefix');
	cmp_ok($dl_info->{hrefLength}, '>', 1000, 'Verify PNG data URL payload is non-trivial (>1000 chars)');

	# Wait for file to be written to disk in download directory
	my $found_file = '';
	ok((wait_until {
		if (opendir(my $dh, $download_dir)) {
			my @matches = grep { /_heatmap\.png$/ } readdir($dh);
			closedir($dh);
			if (@matches) {
				my $candidate = "$download_dir/$matches[0]";
				if (-s $candidate > 0) {
					$found_file = $candidate;
					return 1;
				} else {
					warn "Found heatmap PNG file '$candidate' but it is empty";
				}
			} else {
				warn "No heatmap PNG files found in download directory '$download_dir'";
			}
		} else {
			warn "Could not open download directory '$download_dir': $!";
		}
		return 0;
	} timeout => 15, interval => 0.5), "Verify heatmap PNG file was downloaded to disk for '$expected_label'");

	if ($found_file && -e $found_file) {
		open my $fh, '<:raw', $found_file or die "Could not open downloaded file '$found_file': $!";
		read($fh, my $magic, 8);
		close $fh;
		is($magic, "\x89PNG\r\n\x1a\n", "Verify file '$found_file' has valid PNG magic header bytes");
		unlink $found_file or warn "Could not unlink '$found_file': $!";
	}
}

my $all_checkbox_labels = [
	'Accession Name',
	'Plot Name',
	'Seedlot Name',
	'Plot ID',
	'Plot Number',
	'Family',
	'Cross'
];

# Open the CSV download modal, select requested columns, trigger download, and verify CSV content
sub download_spatial_layout_ok {
	my ($filename, $expected_filepath, $checkboxes, $trigger_xpath) = @_;
	$checkboxes ||= $all_checkbox_labels;
	$trigger_xpath ||= '//button[@title="Download Spatial Layout (CSV)"]';

	my $file_path = "$download_dir/$filename";
	if (-e $file_path) {
		unlink $file_path or die "Could not delete existing file '$file_path': $!";
	}

	$t->click_ok($trigger_xpath, 'xpath', 'Click Download Spatial Layout button');

	foreach my $label (@$all_checkbox_labels) {
		my $element = $t->find_element_ok('//div[contains(@class,"show")]//label[contains(text(),"' . $label . '")]/input', 'xpath', "Find checkbox for '$label'");
		if ( grep { $_ eq $label } @$checkboxes ){
			ok($element->click(), "Enable checkbox for '$label'") unless $element->is_selected();
		} else {
			ok($element->click(), "Disable checkbox for '$label'") if $element->is_selected();
		}
	}

	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Download CSV")]', 'xpath', 'Click Download CSV button');

	ok((wait_until {
		-e $file_path;
	} timeout => 15, interval => 1), "Wait for file '$filename' to be downloaded");

	my $expected_content = do {
		open my $fh, '<', $expected_filepath or die "Could not open expected file '$expected_filepath': $!";
		local $/;
		<$fh>;
	};

	my $actual_content = do {
		open my $fh, '<', $file_path or die "Could not open downloaded file '$file_path': $!";
		local $/;
		<$fh>;
	};

	is($actual_content, $expected_content, "Check that downloaded file content matches expected content");
}

# Programmatically create a trial with specific stock type (cross or family_name) using CXGN::Trial::TrialCreate
sub create_test_trial {
	my ($trial_name, %opts) = @_;
	my $stock_type = $opts{stock_type} || 'accessions';
	my $stock_cvterm_name = ($stock_type eq 'cross' || $stock_type eq 'family_name') ? $stock_type : 'accession';
	my $stock_names = $opts{stocks} || [];
	my $intercrop_stocks = $opts{intercrop_stocks} || [];

	my $stock_type_cvterm = SGN::Model::Cvterm->get_cvterm_row($f->bcs_schema, $stock_cvterm_name, 'stock_type');
	my $organism = $f->bcs_schema->resultset('Organism::Organism')->first();

	my %created_stocks;
	for my $sname (@$stock_names, @$intercrop_stocks) {
		$created_stocks{$sname} = $f->bcs_schema->resultset('Stock::Stock')->find_or_create({
			uniquename  => $sname,
			name        => $sname,
			type_id     => $stock_type_cvterm->cvterm_id,
			organism_id => $organism->organism_id,
		});
	}

	my $design = $opts{design} || {
		1 => { plot_name => "${trial_name}_Plot_101", stock_name => $stock_names->[0], plot_number => 101, block_number => 1, rep_number => 1, row_number => 1, col_number => 1, is_a_control => 0 },
		2 => { plot_name => "${trial_name}_Plot_102", stock_name => $stock_names->[1], plot_number => 102, block_number => 1, rep_number => 1, row_number => 1, col_number => 2, is_a_control => 0 },
		3 => { plot_name => "${trial_name}_Plot_201", stock_name => $stock_names->[2], plot_number => 201, block_number => 2, rep_number => 1, row_number => 2, col_number => 1, is_a_control => 0 },
		4 => { plot_name => "${trial_name}_Plot_202", stock_name => $stock_names->[3], plot_number => 202, block_number => 2, rep_number => 1, row_number => 2, col_number => 2, is_a_control => 0 },
	};

	my ($user_id) = eval { $f->dbh->selectrow_array("SELECT sp_person_id FROM sgn_people.sp_person WHERE username = 'janedoe'") };
	if (!defined $user_id) {
		die "User 'janedoe' not found in fixture database";
	}

	my $trial_type_cvterm = eval { SGN::Model::Cvterm->get_cvterm_row($f->bcs_schema, 'phenotyping_trial', 'project_type') }
		|| $f->bcs_schema->resultset('Cv::Cvterm')->search({ name => 'phenotyping_trial' })->first;
	my $trial_type_id = $trial_type_cvterm ? $trial_type_cvterm->cvterm_id : undef;

	my $trial_create = CXGN::Trial::TrialCreate->new({
		chado_schema      => $f->bcs_schema,
		dbh               => $f->dbh,
		owner_id          => $user_id,
		operator          => 'janedoe',
		trial_year        => '2024',
		trial_description => $opts{description} || "Fieldmap test trial for $stock_type",
		trial_location    => 'test_location',
		program           => 'test',
		trial_name        => $trial_name,
		design_type       => 'CRD',
		trial_type        => $trial_type_id,
		trial_stock_type  => $stock_type,
		design            => $design,
	});

	my $save = $trial_create->save_trial();
	die "Error creating $stock_type trial: " . ($save->{error} || 'unknown error') if $save->{error} || !$save->{trial_id};
	my $trial_id = $save->{trial_id};

	my $trial_stock_type_cvterm = SGN::Model::Cvterm->get_cvterm_row($f->bcs_schema, 'trial_stock_type', 'project_property');
	$f->bcs_schema->resultset('Project::Projectprop')->update_or_create({
		project_id => $trial_id,
		type_id    => $trial_stock_type_cvterm->cvterm_id,
		value      => $stock_type,
		rank       => 0,
	});

	if (my $intercrop_map = $opts{intercrop_mapping}) {
		my $additional_info_cvterm = SGN::Model::Cvterm->get_cvterm_row($f->bcs_schema, 'stock_additional_info', 'stock_property');
		for my $plot_name (keys %$intercrop_map) {
			my $plot_stock = $f->bcs_schema->resultset('Stock::Stock')->find({ uniquename => $plot_name });
			next unless $plot_stock;

			my @intercrop_list;
			for my $iname (@{$intercrop_map->{$plot_name}}) {
				my $istock = $created_stocks{$iname};
				push @intercrop_list, {
					germplasmName => $iname,
					germplasmDbId => $istock->stock_id . "",
				};
			}

			$f->bcs_schema->resultset('Stock::Stockprop')->update_or_create({
				type_id  => $additional_info_cvterm->cvterm_id,
				stock_id => $plot_stock->stock_id,
				rank     => 0,
				value    => encode_json({
					intercropGermplasm => \@intercrop_list,
				}),
			}, { key => 'stockprop_c1' });
		}
	}

	my $trial_layout = CXGN::Trial::TrialLayout->new({
		schema          => $f->bcs_schema,
		trial_id        => $trial_id,
		experiment_type => 'field_layout',
	});
	$trial_layout->generate_and_cache_layout();

	return $trial_id;
}

sub create_trial_with_stock_type {
	my ($trial_name, $stock_type, $stock_names_aref) = @_;
	return create_test_trial($trial_name, stock_type => $stock_type, stocks => $stock_names_aref);
}

sub create_trial_with_overlapping_plots {
	my ($trial_name, $stock_names_aref) = @_;
	return create_test_trial($trial_name,
		stock_type  => 'accessions',
		stocks      => $stock_names_aref,
		description => 'Fieldmap test trial for overlapping plots',
		design      => {
			1 => { plot_name => "${trial_name}_Plot_101", stock_name => $stock_names_aref->[0], plot_number => 101, block_number => 1, rep_number => 1, row_number => 1, col_number => 1, is_a_control => 0 },
			2 => { plot_name => "${trial_name}_Plot_102", stock_name => $stock_names_aref->[1], plot_number => 102, block_number => 1, rep_number => 1, row_number => 1, col_number => 1, is_a_control => 0 },
			3 => { plot_name => "${trial_name}_Plot_103", stock_name => $stock_names_aref->[2], plot_number => 103, block_number => 1, rep_number => 1, row_number => 1, col_number => 2, is_a_control => 0 },
			4 => { plot_name => "${trial_name}_Plot_201", stock_name => $stock_names_aref->[3], plot_number => 201, block_number => 2, rep_number => 1, row_number => 2, col_number => 1, is_a_control => 0 },
			5 => { plot_name => "${trial_name}_Plot_202", stock_name => $stock_names_aref->[4] || $stock_names_aref->[0], plot_number => 202, block_number => 2, rep_number => 1, row_number => 2, col_number => 2, is_a_control => 0 },
		},
	);
}

sub create_trial_with_intercrop_plots {
	my ($trial_name, $primary_accessions_aref, $intercrop_accessions_aref) = @_;
	return create_test_trial($trial_name,
		stock_type        => 'accessions',
		stocks            => $primary_accessions_aref,
		intercrop_stocks  => $intercrop_accessions_aref,
		description       => 'Fieldmap test trial for intercrop',
		intercrop_mapping => {
			"${trial_name}_Plot_101" => [ $intercrop_accessions_aref->[0] ],
			"${trial_name}_Plot_202" => [ $intercrop_accessions_aref->[0], $intercrop_accessions_aref->[1] ],
		},
	);
}

sub create_trial_with_direct_plants {
	my ($trial_name, $stock_names_aref) = @_;

	my $trial_id = create_test_trial($trial_name,
		stock_type  => 'accessions',
		stocks      => $stock_names_aref,
		description => 'Fieldmap test trial for direct plant grid',
	);

	my $plant_type_cvterm   = SGN::Model::Cvterm->get_cvterm_row($f->bcs_schema, 'plant', 'stock_type');
	my $plant_of_cvterm     = SGN::Model::Cvterm->get_cvterm_row($f->bcs_schema, 'plant_of', 'stock_relationship');
	my $plant_number_cvterm = SGN::Model::Cvterm->get_cvterm_row($f->bcs_schema, 'plant_number', 'stock_property');
	my $plant_index_cvterm  = SGN::Model::Cvterm->get_cvterm_row($f->bcs_schema, 'plant_index_number', 'stock_property');
	my $row_number_cvterm   = SGN::Model::Cvterm->get_cvterm_row($f->bcs_schema, 'row_number', 'stock_property');
	my $col_number_cvterm   = SGN::Model::Cvterm->get_cvterm_row($f->bcs_schema, 'col_number', 'stock_property');
	my $organism            = $f->bcs_schema->resultset('Organism::Organism')->first();

	my $field_layout_cvterm = SGN::Model::Cvterm->get_cvterm_row($f->bcs_schema, 'field_layout', 'experiment_type');
	my $exp_project = $f->bcs_schema->resultset('NaturalDiversity::NdExperimentProject')->search({
		project_id => $trial_id,
	})->first;
	my $nd_experiment_id = $exp_project ? $exp_project->nd_experiment_id : undef;

	# Define plant layouts: Plot 101 is a full 2x2 grid; Plot 102 omits (row 2, col 1) as an empty slot
	my @plots_and_plants = (
		[ "${trial_name}_Plot_101", [ [1, 1, 1], [2, 1, 2], [3, 2, 1], [4, 2, 2] ] ],
		[ "${trial_name}_Plot_102", [ [1, 1, 1], [2, 1, 2], [3, 2, 2] ] ],
	);

	for my $entry (@plots_and_plants) {
		my ($plot_name, $plant_coords) = @$entry;
		my $plot = $f->bcs_schema->resultset('Stock::Stock')->find({ uniquename => $plot_name });
		next unless $plot;

		for my $c (@$plant_coords) {
			my ($p, $row, $col) = @$c;
			my $plant_name = "${plot_name}_plant_${p}";
			my $plant = $f->bcs_schema->resultset('Stock::Stock')->create({
				uniquename  => $plant_name,
				name        => $plant_name,
				type_id     => $plant_type_cvterm->cvterm_id,
				organism_id => $organism->organism_id,
			});
			$f->bcs_schema->resultset('Stock::StockRelationship')->create({
				subject_id => $plot->stock_id,
				object_id  => $plant->stock_id,
				type_id    => $plant_of_cvterm->cvterm_id,
			});
			for my $prop (
				[ $plant_number_cvterm->cvterm_id, $p ],
				[ $plant_index_cvterm->cvterm_id,  $p ],
				[ $row_number_cvterm->cvterm_id,   $row ],
				[ $col_number_cvterm->cvterm_id,   $col ],
			) {
				$f->bcs_schema->resultset('Stock::Stockprop')->create({
					stock_id => $plant->stock_id,
					type_id  => $prop->[0],
					value    => "$prop->[1]",
					rank     => 0,
				});
			}
			if ($nd_experiment_id) {
				$f->bcs_schema->resultset('NaturalDiversity::NdExperimentStock')->create({
					nd_experiment_id => $nd_experiment_id,
					stock_id         => $plant->stock_id,
					type_id          => $field_layout_cvterm ? $field_layout_cvterm->cvterm_id : 0,
				});
			}
		}
	}

	for my $term_name ('project_has_plant_entries', 'has_plant_entries') {
		my $cvterm = eval { SGN::Model::Cvterm->get_cvterm_row($f->bcs_schema, $term_name, 'project_property') };
		if ($cvterm) {
			$f->bcs_schema->resultset('Project::Projectprop')->update_or_create({
				project_id => $trial_id,
				type_id    => $cvterm->cvterm_id,
				value      => '1',
				rank       => 0,
			});
		}
	}

	my $trial_layout = CXGN::Trial::TrialLayout->new({
		schema          => $f->bcs_schema,
		trial_id        => $trial_id,
		experiment_type => 'field_layout',
	});
	$trial_layout->generate_and_cache_layout();

	return $trial_id;
}

sub create_trial_with_geo_coordinates {
	my ($trial_name, $stock_names_aref) = @_;

	my $trial_id = create_test_trial($trial_name,
		stock_type  => 'accessions',
		stocks      => $stock_names_aref,
		description => 'Fieldmap test trial for geo layout',
	);

	my $stock_geo_json_cvterm = SGN::Model::Cvterm->get_cvterm_row($f->bcs_schema, 'plot_geo_json', 'stock_property');

	my %plot_coords = (
		"${trial_name}_Plot_101" => [ [ [32.580, 0.340], [32.581, 0.340], [32.581, 0.341], [32.580, 0.341], [32.580, 0.340] ] ],
		"${trial_name}_Plot_102" => [ [ [32.581, 0.340], [32.582, 0.340], [32.582, 0.341], [32.581, 0.341], [32.581, 0.340] ] ],
		"${trial_name}_Plot_201" => [ [ [32.580, 0.341], [32.581, 0.341], [32.581, 0.342], [32.580, 0.342], [32.580, 0.341] ] ],
		"${trial_name}_Plot_202" => [ [ [32.581, 0.341], [32.582, 0.341], [32.582, 0.342], [32.581, 0.342], [32.581, 0.341] ] ],
	);

	for my $plot_name (keys %plot_coords) {
		my $plot = $f->bcs_schema->resultset('Stock::Stock')->find({ uniquename => $plot_name });
		next unless $plot;

		my $geo_json = {
			type => 'Feature',
			geometry => {
				type => 'Polygon',
				coordinates => $plot_coords{$plot_name},
			},
			properties => {
				plot_name => $plot_name,
			}
		};

		$plot->create_stockprops({
			$stock_geo_json_cvterm->name() => encode_json($geo_json),
		});
	}

	my $trial_layout = CXGN::Trial::TrialLayout->new({
		schema          => $f->bcs_schema,
		trial_id        => $trial_id,
		experiment_type => 'field_layout',
	});
	$trial_layout->generate_and_cache_layout();

	return $trial_id;
}


1;