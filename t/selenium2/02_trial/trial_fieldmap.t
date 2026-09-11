use lib 't/lib';
use strict;
use warnings;

use Test::More;

use File::Copy;
use JSON;
use SGN::Model::Cvterm;
use SGN::Test::WWW::WebDriver;
use SGN::Test::Fixture;
use CXGN::Trial::TrialCreate;
use CXGN::Trial::TrialLayout;
my $t = SGN::Test::WWW::WebDriver->new();
my $f = SGN::Test::Fixture->new();

use Selenium::Waiter qw(wait_until);
use Selenium::Firefox::Profile;

# -----------------------------------------------------------------------------
# Browser Profile Setup: Automatically save CSV downloads to /downloads directory
# -----------------------------------------------------------------------------
my $profile = Selenium::Firefox::Profile->new;
$profile->set_preference( 'browser.download.folderList', 2 );
$profile->set_preference( 'browser.download.dir', '/downloads' );
$profile->set_preference( 'browser.helperApps.neverAsk.saveToDisk', 'application/csv;text/csv,image/png' );
$profile->set_preference( 'dom.disable_open_during_load', \0 );

my $driver = Selenium::Remote::Driver->new(
    firefox_profile    => $profile,
    base_url           => $ENV{SGN_TEST_SERVER},
    remote_server_addr => $ENV{SGN_REMOTE_SERVER_ADDR} || 'localhost'
);
$t->driver($driver);

my $download_dir = '/selenium/downloads';

# -----------------------------------------------------------------------------
# Field Map Layout Constants & Color Definitions
# -----------------------------------------------------------------------------
my $svg_id = 'fieldmap_chart_svg';

# Grid cell dimensions and label positioning offsets (in SVG units/pixels)
my $CELL_SIZE                       = 52;
my $CELL_HALF                       = 25;
my $LABEL_Y_OFFSET                  = 30;
my $LABEL_Y_OFFSET_STAGGERED_TOP    = 20;
my $LABEL_Y_OFFSET_STAGGERED_BOTTOM = 40;

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
	my ($columns, $rows, $filler_accession) = @_;
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
	ok(wait_until {
		my $info = $t->driver->execute_script('return window.__lastHeatmapDownload;');
		return defined $info && $info->{hrefLength} > 100;
	} timeout => 15, interval => 0.5, "Wait for heatmap image download data to be generated for '$expected_label'");

	my $dl_info = $t->driver->execute_script('return window.__lastHeatmapDownload;');
	is($dl_info->{download}, "${expected_label}_heatmap.png", "Verify download filename attribute is '${expected_label}_heatmap.png'");
	like($dl_info->{hrefPrefix}, qr{^data:image/png;base64,}, 'Verify download data URL has image/png base64 prefix');
	cmp_ok($dl_info->{hrefLength}, '>', 1000, 'Verify PNG data URL payload is non-trivial (>1000 chars)');

	# Wait for file to be written to disk in download directory
	my $found_file = '';
	ok(wait_until {
		if (opendir(my $dh, $download_dir)) {
			my @matches = grep { /_heatmap\.png$/ } readdir($dh);
			closedir($dh);
			if (@matches) {
				my $candidate = "$download_dir/$matches[0]";
				if (-s $candidate > 0) {
					$found_file = $candidate;
					return 1;
				}
			}
		}
		return 0;
	} timeout => 15, interval => 0.5, "Verify heatmap PNG file was downloaded to disk for '$expected_label'");

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

	foreach my $label (@$checkboxes) {
		my $element = $t->find_element_ok('//div[contains(@class,"show")]//label[contains(text(),"' . $label . '")]/input', 'xpath', "Find checkbox for '$label'");

		next if $element->is_selected();
		ok($element->click(), "Click checkbox for '$label'");
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

# -----------------------------------------------------------------------------
# Fixture Setup: Mark plot CASS_6Genotypes_107 as a control
# -----------------------------------------------------------------------------
my $plot = $f->bcs_schema->resultset('Stock::Stock')->find({ uniquename => 'CASS_6Genotypes_107' });
$plot->create_stockprops({
	'is a control'          => 1,
	'stock_additional_info' => '{"is_a_control": 1}',
});

# -----------------------------------------------------------------------------
# Fixture Setup: Create spatial adjustments for trial 165
# -----------------------------------------------------------------------------
# Get an assayed trait ID
my $trait_sth = $f->dbh->prepare(<<'EOSQL');
	SELECT DISTINCT pheno.observable_id
	FROM project p
	JOIN nd_experiment_project nep ON p.project_id = nep.project_id
	JOIN nd_experiment_phenotype nep2 ON nep.nd_experiment_id = nep2.nd_experiment_id
	JOIN phenotype pheno ON nep2.phenotype_id = pheno.phenotype_id
	JOIN cvterm ON pheno.observable_id = cvterm.cvterm_id
	WHERE p.project_id = 165 AND cvterm.name LIKE 'cass sink leaf%3-phosphoglyceric acid%'
	LIMIT 1;
EOSQL
$trait_sth->execute();
my ($spatial_trait_id) = $trait_sth->fetchrow_array();
die "No assayed trait matching 'cass sink leaf%3-phosphoglyceric acid%' found for trial 165 in fixture database" unless $spatial_trait_id;

# Get all plot uniquenames
my $plot_sth = $f->dbh->prepare(<<'EOSQL');
	SELECT DISTINCT s.uniquename
	FROM project p
	JOIN nd_experiment_project nep ON p.project_id = nep.project_id
	JOIN nd_experiment_stock nes ON nep.nd_experiment_id = nes.nd_experiment_id
	JOIN stock s ON nes.stock_id = s.stock_id
	JOIN cvterm t ON s.type_id = t.cvterm_id
	WHERE p.project_id = 165 AND t.name = 'plot';
EOSQL
$plot_sth->execute();

# Assign spatial adjustments to each plot
my %spatial_adj;
while (my ($plot_uniquename) = $plot_sth->fetchrow_array()) {
	$spatial_adj{$plot_uniquename} = { "$spatial_trait_id" => 5.0 };
}
$spatial_adj{'CASS_6Genotypes_103'} = { "$spatial_trait_id" => -5.0 };

# Store spatial adjustments for trial 165
my $spatial_cvterm = SGN::Model::Cvterm->get_cvterm_row($f->bcs_schema, 'spatially_corrected_trait_adjustments_json', 'project_property');
$f->bcs_schema->resultset('Project::Projectprop')->search({
	project_id => 165,
	type_id    => $spatial_cvterm->cvterm_id,
})->delete_all();
$f->bcs_schema->resultset('Project::Projectprop')->create({
	project_id => 165,
	type_id    => $spatial_cvterm->cvterm_id,
	value      => encode_json(\%spatial_adj),
	rank       => 0,
});

# -----------------------------------------------------------------------------
# Test Suite
# -----------------------------------------------------------------------------

$t->while_logged_in_as("curator", sub {
	# =========================================================================
	# Navigation & Initial Field Map Loading
	# =========================================================================
	$t->get_ok('/breeders/trial/165', 'Navigate to trial page');

	$t->click_ok('pheno_heatmap_onswitch', 'id', 'Open fieldmap section');
	$t->wait_for_working_dialog();
	$t->find_element_ok('//*[@id="' . $svg_id . '"]', 'xpath', 'Find fieldmap SVG');
	$t->find_element_ok('//div[@id="legend_list"]//span[contains(normalize-space(),"Checks")]', 'xpath', 'Find Checks item in legend');
	$t->find_element_ok('//div[@id="legend_list"]//span[contains(normalize-space(),"Checks")]//span[contains(@class,"tw:bg-[#6a5acd]")]', 'xpath', 'Find purple swatch for Checks in legend');
	ok(!scalar(@{$t->driver->find_elements('//button[contains(text(),"Download Heatmap Image")]', 'xpath')}), 'Download Heatmap Image button is not visible in Field Layout view');

	# =========================================================================
	# Zoom & Pan Controls (Buttons, Mouse Wheel, Mouse Drag)
	# =========================================================================
	my $tf = get_svg_transform();
	is($tf->{zoom}, 1, 'Initial zoom is 1');
	is($tf->{x}, 0, 'Initial pan X is 0');
	is($tf->{y}, 0, 'Initial pan Y is 0');

	# Test Zoom In button (scale by 1.2x each click)
	$t->click_ok('//button[@title="Zoom In"]', 'xpath', 'Click Zoom In button');
	$tf = get_svg_transform();
	cmp_ok(abs($tf->{zoom} - 1.2), '<', 0.05, 'Zoom level is ~1.2 after Zoom In');

	$t->click_ok('//button[@title="Zoom In"]', 'xpath', 'Click Zoom In button again');
	$tf = get_svg_transform();
	cmp_ok(abs($tf->{zoom} - 1.44), '<', 0.05, 'Zoom level is ~1.44 after second Zoom In');

	# Test Zoom Out button (scale down by 1.2x)
	$t->click_ok('//button[@title="Zoom Out"]', 'xpath', 'Click Zoom Out button');
	$tf = get_svg_transform();
	cmp_ok(abs($tf->{zoom} - 1.2), '<', 0.05, 'Zoom level is ~1.2 after Zoom Out');

	# Test Reset View button
	$t->click_ok('//button[@title="Reset View"]', 'xpath', 'Click Reset View button');
	$tf = get_svg_transform();
	is($tf->{zoom}, 1, 'Zoom reset to 1');
	is($tf->{x}, 0, 'Pan X reset to 0');
	is($tf->{y}, 0, 'Pan Y reset to 0');

	# Test mouse wheel zooming (negative deltaY zooms in, positive zooms out)
	mouse_wheel_zoom(-100);
	$tf = get_svg_transform();
	cmp_ok(abs($tf->{zoom} - 1.1), '<', 0.05, 'Zoom level is ~1.1 after wheel zoom in');

	mouse_wheel_zoom(100);
	$tf = get_svg_transform();
	cmp_ok(abs($tf->{zoom} - 1.0), '<', 0.05, 'Zoom level is ~1.0 after wheel zoom out');

	$t->click_ok('//button[@title="Reset View"]', 'xpath', 'Click Reset View button after wheel zoom');
	$tf = get_svg_transform();
	is($tf->{zoom}, 1, 'Zoom reset to 1 after wheel zoom');
	is($tf->{x}, 0, 'Pan X reset to 0 after wheel zoom');
	is($tf->{y}, 0, 'Pan Y reset to 0 after wheel zoom');

	# Test mouse click-and-drag panning
	drag_svg(60, 40);
	$tf = get_svg_transform();
	cmp_ok(abs($tf->{x} - 60), '<', 2, 'Pan X moved by ~60px after drag');
	cmp_ok(abs($tf->{y} - 40), '<', 2, 'Pan Y moved by ~40px after drag');

	$t->click_ok('//button[@title="Reset View"]', 'xpath', 'Click Reset View button after drag');
	$tf = get_svg_transform();
	is($tf->{zoom}, 1, 'Zoom reset to 1 after drag');
	is($tf->{x}, 0, 'Pan X reset to 0 after drag');
	is($tf->{y}, 0, 'Pan Y reset to 0 after drag');

	# =========================================================================
	# Interactive Hover Tooltip (Field Layout View)
	# =========================================================================
	hover_plot_cell(0, 2);
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]', 'xpath', 'Tooltip is visible on plot hover');
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Plot Name:")]/parent::div[contains(.,"CASS_6Genotypes_103")]', 'xpath', 'Tooltip displays Plot Name');
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Plot Number:")]/parent::div[contains(.,"103")]', 'xpath', 'Tooltip displays Plot Number');
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Block Number:")]/parent::div[contains(.,"1")]', 'xpath', 'Tooltip displays Block Number');
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Rep Number:")]/parent::div[contains(.,"1")]', 'xpath', 'Tooltip displays Rep Number');
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Accession Name:")]/parent::div[contains(.,"IITA-TMS-IBA980581")]', 'xpath', 'Tooltip displays Accession Name');

	# Hover over check plot and verify updated tooltip contents
	hover_plot_cell(4, 2);
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Plot Name:")]/parent::div[contains(.,"CASS_6Genotypes_107")]', 'xpath', 'Tooltip displays check Plot Name');
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Plot Number:")]/parent::div[contains(.,"107")]', 'xpath', 'Tooltip displays check Plot Number');
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Accession Name:")]/parent::div[contains(.,"TMEB693")]', 'xpath', 'Tooltip displays check Accession Name');

	# Unhover dismisses tooltip
	unhover_plot_cell(4, 2);
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"fieldmap-tooltip")]', 'xpath')}), 'Tooltip dismissed after unhover');

	# =========================================================================
	# Plot Cell Coloring ("Color By" Options)
	# =========================================================================
	find_plot_cell_ok(0, 2);
	find_plot_cell_ok(6, 0);

	# Default parity coloring (even block vs odd block fills)
	find_plot_cell_ok(0, 2, $odd_block_fill);
	find_plot_cell_ok(0, 1, $even_block_fill);
	find_plot_cell_ok(0, 0, $odd_block_fill);
	find_plot_cell_ok(4, 2, $check_fill);

	# Color by Block
	set_color_by('block');
	find_plot_cell_ok(0, 2, $palette[0]);
	find_plot_cell_ok(1, 2, $palette[0]);
	find_plot_cell_ok(0, 1, $palette[1]);
	find_plot_cell_ok(0, 0, $palette[2]);
	find_plot_cell_ok(4, 2, $check_fill);

	# Color by Germplasm (Accession)
	set_color_by('germplasm');
	find_plot_cell_ok(0, 2, $palette[4]);
	find_plot_cell_ok(1, 2, $palette[3]);
	find_plot_cell_ok(2, 2, $palette[2]);
	find_plot_cell_ok(3, 2, $palette[1]);
	find_plot_cell_ok(0, 1, $palette[0]);
	find_plot_cell_ok(4, 2, $check_fill);

	# Color by Family Name & Cross Name (falls back to even_block_fill when not set)
	set_color_by('family_name');
	find_plot_cell_ok(0, 2, $even_block_fill);

	set_color_by('cross_name');
	find_plot_cell_ok(0, 2, $even_block_fill);

	# Reset back to Parity
	set_color_by('parity');
	find_plot_cell_ok(0, 2, $odd_block_fill);
	find_plot_cell_ok(0, 1, $even_block_fill);

	# =========================================================================
	# Plot Cell Labeling ("Label By" Options & Font Size)
	# =========================================================================
	# Label by Germplasm (Accession) with staggered vertical text positioning
	set_label_by('germplasm');
	set_label_size(14);
	find_plot_label_ok('IITA-TMS-IBA980581', 0, 2, font_size => 14, staggered => 1);
	find_plot_label_ok('IITA-TMS-IBA980002', 1, 2, font_size => 14, staggered => 1);
	find_plot_label_ok('IITA-TMS-IBA30572', 2, 2, font_size => 14, staggered => 1);
	find_plot_label_ok('BLANK', 0, 1, font_size => 14, staggered => 1);

	# Label by Block
	set_label_by('block');
	find_plot_label_ok('1', 0, 2, font_size => 14);
	find_plot_label_ok('2', 0, 1, font_size => 14);
	find_plot_label_ok('3', 0, 0, font_size => 14);

	# Label by Family Name & Cross Name (verify no inappropriate labels rendered)
	set_label_by('family_name');
	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="IITA-TMS-IBA980581"]', 'xpath')}), 'No accession labels found when labeled by family');
	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="101"]', 'xpath')}), 'No plot number labels found when labeled by family');

	set_label_by('cross_name');
	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="IITA-TMS-IBA980581"]', 'xpath')}), 'No accession labels found when labeled by cross');
	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="101"]', 'xpath')}), 'No plot number labels found when labeled by cross');

	# Reset back to Plot Number labeling
	set_label_size(10);
	set_label_by('plot_number');
	find_plot_label_ok('103', 0, 2);
	find_plot_label_ok('201', 0, 1);
	find_plot_label_ok('301', 0, 0);

	# =========================================================================
	# Assayed Trait Heatmap View
	# =========================================================================
	set_layout_view('cass sink leaf|3-phosphoglyceric acid|ug/g|week 16|COMP:0000013');
	$t->find_element_ok('//div[@id="legend_list"]//span[contains(.,"Low trait value (cass sink leaf|3-phosphoglyceric acid|ug/g|week 16|COMP:0000013)")]', 'xpath', 'Find low trait value text in legend');
	$t->find_element_ok('//div[@id="legend_list"]//span[contains(text(),"High trait value")]', 'xpath', 'Find high trait value text in legend');
	$t->find_element_ok('//div[@id="legend_list"]//div[contains(@style,"linear-gradient")]', 'xpath', 'Find color gradient bar in legend');
	$t->find_element_ok('//button[contains(text(),"Download Heatmap Image")]', 'xpath', 'Find Download Heatmap Image button');
	$t->find_element_ok('//button[contains(text(),"Delete Selected Trait")]', 'xpath', 'Find Delete Selected Trait button');

	# Verify plot fill colors match heatmap gradient values
	find_plot_cell_ok(0, 2, '#910d0d');
	find_plot_cell_ok(2, 2, '#8b0000');
	find_plot_cell_ok(0, 1, '#a9afaf');
	find_plot_cell_ok(5, 0, '#ffffff');

	# Interactive Hover Tooltip in Heatmap View
	hover_plot_cell(0, 2);
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Trait Name:")]', 'xpath', 'Tooltip displays Trait Name header in heatmap view');
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Trait Name:")]/parent::div[contains(.,"cass sink leaf|3-phosphoglyceric acid")]', 'xpath', 'Tooltip displays Trait Name in heatmap view');
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Trait Value:")]', 'xpath', 'Tooltip displays Trait Value in heatmap view');
	unhover_plot_cell(0, 2);
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"fieldmap-tooltip")]', 'xpath')}), 'Tooltip dismissed after unhover in heatmap view');

	# =========================================================================
	# Print Field Map Action (Heatmap View)
	# =========================================================================
	test_print_field_map_ok('cass sink leaf|3-phosphoglyceric acid|ug/g|week 16|COMP:0000013');

	# =========================================================================
	# Heatmap PNG Image Download Action
	# =========================================================================
	test_download_heatmap_image_ok('cass sink leaf|3-phosphoglyceric acid|ug/g|week 16|COMP:0000013');

	# =========================================================================
	# Spatial Corrections Heatmap Views
	# =========================================================================
	# Verify Spatial Corrections optgroup and options exist
	$t->find_element_ok('//optgroup[@label="Spatial Corrections"]', 'xpath', 'Find Spatial Corrections optgroup');
	$t->find_element_ok('//optgroup[@label="Spatial Corrections"]/option[@value="' . $spatial_trait_id . ' (corrected)"]', 'xpath', 'Find corrected option');
	$t->find_element_ok('//optgroup[@label="Spatial Corrections"]/option[@value="' . $spatial_trait_id . ' (adjustment)"]', 'xpath', 'Find adjustment option');

	# Select (adjustment) view
	set_layout_view("$spatial_trait_id (adjustment)");
	$t->find_element_ok('//div[@id="legend_list"]//span[contains(text(),"Low trait value") and contains(.,"(adjustment)")]', 'xpath', 'Verify legend displays adjustment view label');
	$t->find_element_ok('//div[@id="legend_list"]//div[contains(@style,"linear-gradient")]', 'xpath', 'Verify heatmap gradient bar in adjustment view');
	find_plot_cell_ok(0, 2, '#00008b');

	# Select (corrected) view
	set_layout_view("$spatial_trait_id (corrected)");
	$t->find_element_ok('//div[@id="legend_list"]//span[contains(text(),"Low trait value") and contains(.,"(corrected)")]', 'xpath', 'Verify legend displays corrected view label');
	test_download_heatmap_image_ok('cass sink leaf|3-phosphoglyceric acid|ug/g|week 16|COMP:0000013 (corrected)');

	# Switch back to raw Assayed Trait view
	set_layout_view($spatial_trait_id);
	find_plot_cell_ok(0, 2, '#910d0d');

	# =========================================================================
	# Controls & Check Plots Panel
	# =========================================================================
	$t->find_element_ok('//button[contains(text(),"View Controls")]', 'xpath', 'Find View Controls button in heatmap view');
	$t->click_ok('//button[contains(text(),"View Controls")]', 'xpath', 'Click View Controls button');

	# Verify control dropdown is displayed
	$t->find_element_ok('//select[option[contains(text(),"checks and plot numbers")]]', 'xpath', 'Find control plots dropdown');

	# Select the control plot
	$t->click_option_ok('//select[option[contains(.,"checks and plot numbers")]]/option[contains(.,"CASS_6Genotypes_107")]', 'xpath', 'Select CASS_6Genotypes_107 control plot');

	# Verify relationship text
	$t->find_element_ok('//span[contains(.,"Plot: CASS_6Genotypes_107 contains Check: TMEB693")]', 'xpath', 'Verify control relationship text displayed');

	# Deselect control plot and verify relationship text clears
	$t->click_option_ok('//select[option[contains(text(),"checks and plot numbers")]]/option[@value=""]', 'xpath', 'Select default checks and plot numbers option');
	ok(!scalar(@{$t->driver->find_elements('//span[contains(text(),"contains Check:")]', 'xpath')}), 'Control relationship text is cleared');

	# Re-select and test Hide button
	$t->click_option_ok('//select[option[contains(.,"checks and plot numbers")]]/option[contains(.,"CASS_6Genotypes_107")]', 'xpath', 'Re-select CASS_6Genotypes_107 control plot');
	$t->find_element_ok('//span[contains(.,"Plot: CASS_6Genotypes_107 contains Check: TMEB693")]', 'xpath', 'Verify control relationship text displayed again');
	$t->click_ok('//button[contains(@class,"btn-default") and text()="Hide"]', 'xpath', 'Click Hide controls button');
	$t->find_element_ok('//button[contains(text(),"View Controls")]', 'xpath', 'Verify View Controls button reappears');
	ok(!scalar(@{$t->driver->find_elements('//select[option[contains(text(),"checks and plot numbers")]]', 'xpath')}), 'Control dropdown is hidden after clicking Hide');

	# =========================================================================
	# Phenotype Measurement Suppression Workflow
	# =========================================================================
	# Open plot details modal and suppress phenotype value
	click_plot_cell_ok(0, 2);
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(text(),"Plot Details")]', 'xpath', 'Plot details modal is open');
	$t->click_ok('//div[contains(@class,"show")]//a[contains(text(),"Replace")]', 'xpath', 'Click Replace tab in plot details modal');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Suppress Current Trait Value")]', 'xpath', 'Click Suppress Current Trait Value button');
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(text(),"Suppress Plot Phenotype Measurement")]', 'xpath', 'Suppress phenotype modal is open');
	$t->find_element_ok('//div[contains(@class,"show")]//div[strong[contains(text(),"Plot Name:")]]', 'xpath', 'Verify plot name in suppress modal');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(@class,"btn-danger") and contains(text(),"Suppress Phenotype")]', 'xpath', 'Click Suppress Phenotype button');
	my $alert_text = $t->get_alert_text();
	$t->accept_alert_ok('Accept alert after suppressing phenotype');
	is($alert_text, 'Phenotype was suppressed successfully!', 'Verify alert text for successful suppression');
	$t->wait_for_network_idle();

	# Attempt re-suppression on already-suppressed plot to verify the server has recorded our change
	# and prevents duplicate suppression
	click_plot_cell_ok(0, 2);
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(text(),"Plot Details")]', 'xpath', 'Plot details modal is open');
	$t->click_ok('//div[contains(@class,"show")]//a[contains(text(),"Replace")]', 'xpath', 'Click Replace tab in plot details modal');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Suppress Current Trait Value")]', 'xpath', 'Click Suppress Current Trait Value button');
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(text(),"Suppress Plot Phenotype Measurement")]', 'xpath', 'Suppress phenotype modal is open');
	$t->find_element_ok('//div[contains(@class,"show")]//div[strong[contains(text(),"Plot Name:")]]', 'xpath', 'Verify plot name in suppress modal');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(@class,"btn-danger") and contains(text(),"Suppress Phenotype")]', 'xpath', 'Click Suppress Phenotype button');
	$alert_text = $t->get_alert_text();
	$t->accept_alert_ok('Accept alert after suppressing phenotype');
	is($alert_text, 'This plot phenotype has already been suppressed.', 'Verify alert text for already suppressed phenotype');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(@class,"btn-danger") and contains(text(),"Suppress Phenotype")]/preceding-sibling::button[contains(text(),"Close")]', 'xpath', 'Click Close button in suppress modal');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Click Close button in plot details modal');

	# =========================================================================
	# Assayed Trait Deletion Workflow
	# =========================================================================
	# Open modal and test cancel/close
	$t->click_ok('//button[contains(text(),"Delete Selected Trait")]', 'xpath', 'Click Delete Selected Trait button to test cancel');
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(text(),"Assayed Trait Deletion")]', 'xpath', 'Assayed Trait Deletion modal is open');
	$t->find_element_ok('//div[contains(@class,"show")]//p[contains(text(),"Are you sure you want to delete this assayed trait?")]', 'xpath', 'Verify delete trait warning text');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Click Close button in Delete Trait modal');
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"show")]//h4[contains(text(),"Assayed Trait Deletion")]', 'xpath')}), 'Delete Trait modal is closed');

	# Open modal and confirm deletion
	$t->click_ok('//button[contains(text(),"Delete Selected Trait")]', 'xpath', 'Click Delete Selected Trait button to confirm deletion');
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(text(),"Assayed Trait Deletion")]', 'xpath', 'Assayed Trait Deletion modal is open again');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(@class,"btn-danger") and contains(text(),"Delete Trait")]', 'xpath', 'Click Delete Trait confirm button in modal');
	$alert_text = $t->get_alert_text();
	$t->accept_alert_ok('Accept alert after deleting trait');
	is($alert_text, 'Trait deleted successfully!', 'Verify alert text for successful trait deletion');
	$t->wait_for_network_idle();

	# Verify trait is removed and layout view resets to fieldmap
	ok(!scalar(@{$t->driver->find_elements('//label[contains(text(),"Select Layout View:")]/following-sibling::select//option[contains(text(),"cass sink leaf|3-phosphoglyceric acid")]', 'xpath')}), 'Deleted trait option is no longer in Select Layout View dropdown');
	ok(!scalar(@{$t->driver->find_elements('//div[@id="legend_list"]//span[contains(.,"Low trait value")]', 'xpath')}), 'Low trait value legend not present after trait deletion');
	ok(!scalar(@{$t->driver->find_elements('//div[@id="legend_list"]//div[contains(@style,"linear-gradient")]', 'xpath')}), 'Gradient bar not present after trait deletion');
	ok(!scalar(@{$t->driver->find_elements('//button[contains(text(),"Delete Selected Trait")]', 'xpath')}), 'Delete Selected Trait button not present after trait deletion');
	ok(!scalar(@{$t->driver->find_elements('//button[contains(text(),"Download Heatmap Image")]', 'xpath')}), 'Download Heatmap Image button not present after trait deletion');
	ok(!scalar(@{$t->driver->find_elements('//button[contains(text(),"View Controls")]', 'xpath')}), 'View Controls button not present in Field Layout view');
	find_plot_cell_ok(0, 2, $odd_block_fill);
	find_plot_cell_ok(0, 1, $even_block_fill);
	find_plot_cell_ok(4, 2, $check_fill);

	# =========================================================================
	# North Arrow Orientation Configuration
	# =========================================================================
	find_north_arrow_ok(0);

	set_north_arrow_angle(45);
	find_north_arrow_ok(45);

	set_north_arrow_angle(135);
	find_north_arrow_ok(135);

	set_north_arrow_angle(0);
	find_north_arrow_ok(0);

	# =========================================================================
	# Secondary Axis Configuration & Rendering
	# =========================================================================
	set_secondary_axis('Test X Label', 'Test Y Label', 'tx1,tx2,tx3,tx4', 'ty1,ty2,ty3,ty4');

	find_sec_x_label_ok('Test X Label', 7, 3, 'top');
	find_sec_x_label_ok('Test X Label', 7, 3, 'bottom');
	find_sec_y_label_ok('Test Y Label', 7, 3, 'left');
	find_sec_y_label_ok('Test Y Label', 7, 3, 'right');

	find_sec_x_val_ok('tx1', 0, 3, 'top');
	find_sec_x_val_ok('tx1', 0, 3, 'bottom');
	find_sec_y_val_ok('ty3', 0, 7, 'left');
	find_sec_y_val_ok('ty3', 0, 7, 'right');

	# =========================================================================
	# Layout Transformations & Border Inset Layers
	# =========================================================================
	# Rotate layout 90 degrees clockwise
	$t->click_ok('//button[@title="Rotate"]', 'xpath', 'Click Rotate button');
	find_plot_label_ok('103', 0, 0);
	find_plot_label_ok('207', 1, 6);
	find_sec_y_val_ok('tx3', 2, 3, 'right');
	find_north_arrow_ok(90);

	# Transpose layout across diagonal axis
	$t->click_ok('//button[@title="Transpose Display"]', 'xpath', 'Click Transpose Display button');
	find_plot_label_ok('103', 6, 2);
	find_plot_label_ok('307', 0, 0);

	# Invert Rows
	$t->click_ok('//label[contains(text(),"Invert Rows")]/input', 'xpath', 'Click Invert Rows checkbox');
	find_plot_label_ok('104', 5, 0);
	find_plot_label_ok('205', 2, 1);
	find_sec_y_val_ok('ty3', 2, 7, 'right');
	find_sec_x_val_ok('tx4', 3, 3, 'bottom');
	find_north_arrow_ok(180);

	# Toggle top, left, and bottom border layers
	$t->click_ok('//label[contains(text(),"Top")]/input', 'xpath', 'Click Top checkbox');
	find_plot_cell_ok(3, 3, $border_fill);

	$t->click_ok('//label[contains(text(),"Left")]/input', 'xpath', 'Click Left checkbox');
	find_plot_cell_ok(0, 1, $border_fill);

	$t->click_ok('//label[contains(text(),"Bottom")]/input', 'xpath', 'Click Bottom checkbox');
	find_plot_cell_ok(2, 0, $border_fill);
	$t->click_ok('//label[contains(text(),"Bottom")]/input', 'xpath', 'Click Bottom checkbox');

	$t->click_ok('//button[@title="Rotate"]', 'xpath', 'Click Rotate button');
	$t->click_ok('//label[contains(text(),"Right")]/input', 'xpath', 'Click Right checkbox');
	find_plot_cell_ok(4, 6, $border_fill);
	find_sec_x_val_ok('ty3', 3, undef, 'top');

	# =========================================================================
	# Dimension Adjustments & Grid Layout Recalculation
	# =========================================================================
	# Test canceling the Change Dimensions modal
	$t->click_ok('//button[@title="Change Dimensions"]', 'xpath', 'Click Change Dimensions button to test cancel');
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(text(),"Change Layout Dimensions")]', 'xpath', 'Change Layout Dimensions modal is open');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Cancel")]', 'xpath', 'Click Cancel button in Change Dimensions modal');
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"show")]//h4[contains(text(),"Change Layout Dimensions")]', 'xpath')}), 'Change Layout Dimensions modal is closed');

	# Test invalid dimensions error handling (rows * cols < total plots)
	$t->click_ok('//button[@title="Change Dimensions"]', 'xpath', 'Click Change Dimensions button to test invalid dimensions');
	$t->send_keys_ok('//label[contains(text(),"Columns")]/following-sibling::input', 'xpath', '2', 'Set Columns input to 2 (invalid)', clear => 1);
	$t->send_keys_ok('//label[contains(text(),"Rows")]/following-sibling::input', 'xpath', '2', 'Set Rows input to 2 (invalid)', clear => 1);
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Apply")]', 'xpath', 'Click Apply button with invalid dimensions');
	my $invalid_dim_alert = $t->get_alert_text();
	is($invalid_dim_alert, "Those are not valid dimensions.\nPlease select dimensions that can accommodate your current plots.", 'Verify alert text for invalid dimensions');
	$t->accept_alert_ok('Accept invalid dimensions alert');

	# Verify grid layout was unchanged by the invalid dimensions attempt
	find_plot_cell_ok(4, 6, $border_fill);
	find_sec_x_val_ok('ty3', 3, undef, 'top');

	set_dimensions(4, undef);
	find_plot_label_ok('301', 4, 3);
	find_plot_label_ok('307', 3, 4);
	find_north_arrow_ok(90);

	# =========================================================================
	# Spatial Layout CSV Export Customization
	# =========================================================================
	# Verify opening and closing modal via toolbar button
	$t->click_ok('//button[@title="Download Spatial Layout (CSV)"]', 'xpath', 'Click Download Spatial Layout toolbar button to test open/close');
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(text(),"Download Spatial Layout Customizer")]', 'xpath', 'Download Spatial Layout Customizer modal is open');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Click Close button in Download CSV modal');
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"show")]//h4[contains(text(),"Download Spatial Layout Customizer")]', 'xpath')}), 'Download CSV modal is closed after clicking Close');

	# Test CSV download with specific subset of metadata columns (opened via toolbar button)
	download_spatial_layout_ok(
		'Trial_165_spatial_layout.csv',
		't/data/fieldmap/Trial_165_spatial_layout_t1.csv',
		['Accession Name', 'Plot Number', 'Family']
	);

	# Test CSV download with all metadata columns enabled (opened via toolbar button)
	download_spatial_layout_ok(
		'Trial_165_spatial_layout.csv',
		't/data/fieldmap/Trial_165_spatial_layout_t2.csv',
		undef
	);

	# =========================================================================
	# Plot Details Modal & Accession Replacement (Curator Override)
	# =========================================================================
	click_plot_cell_ok(3, 2);
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(.,"CASS_6Genotypes_206")]', 'xpath', 'Verify initial plot name CASS_6Genotypes_206 in modal header');
	$t->find_element_ok('//div[contains(@class,"show")]//tr[td[contains(text(),"Accession")]]/td[2][contains(text(),"IITA-TMS-IBA30572")]', 'xpath', 'Verify accession name IITA-TMS-IBA30572 is displayed in the details modal');
	$t->find_element_ok('//tr[td[contains(text(),"Plot Number")]]/td[2][contains(text(),"206")]', 'xpath', 'Verify plot number 206 is displayed in the details modal');
	$t->find_element_ok('//tr[td[contains(text(),"Coordinates")]]/td[2][contains(normalize-space(),"3 / 3")]', 'xpath', 'Verify coordinates are 3 / 3');
	$t->find_element_ok('//h5[contains(text(),"Plot Contents & Structure Hierarchy:")]/following-sibling::div/pre[contains(text(),"CASS_6Genotypes_206")]', 'xpath', 'Verify plot contents and structure hierarchy is displayed in the details modal');

	# Replace accession and confirm curator override dialog
	$t->click_ok('//div[contains(@class,"show")]//a[contains(text(),"Replace")]', 'xpath', 'Click Replace Accession tab');
	$t->send_keys_ok('//div[contains(@class,"show")]//label[contains(normalize-space(),"Accession")]/following-sibling::div//input', 'xpath', 'XG120015', 'Set New Accession Name input to XG120015');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Update")]', 'xpath', 'Click Update Accession button');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Override")]', 'xpath', 'Click override button in modal');
	$t->accept_alert_ok('Accept alert after updating accession');

	# Verify updated accession in plot details
	$t->wait_for_network_idle();
	click_plot_cell_ok(3, 2);
	$t->find_element_ok('//div[contains(@class,"show")]//tr[td[contains(text(),"Accession")]]/td[2][contains(text(),"XG120015")]', 'xpath', 'Verify accession name XG120015 is displayed in the details modal');
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(.,"CASS_6Genotypes_206")]', 'xpath', 'Verify plot name remains CASS_6Genotypes_206 when new plot name is omitted');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Click Close button in details modal');

	# =========================================================================
	# Custom Plot Renaming on Accession Change
	# =========================================================================
	click_plot_cell_ok(3, 2);
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(.,"CASS_6Genotypes_206")]', 'xpath', 'Verify plot name before custom renaming');
	$t->click_ok('//div[contains(@class,"show")]//a[contains(text(),"Replace")]', 'xpath', 'Click Replace Accession tab for custom renaming');
	$t->send_keys_ok('//div[contains(@class,"show")]//label[contains(normalize-space(),"Accession")]/following-sibling::div//input', 'xpath', 'IITA-TMS-IBA30572', 'Set New Accession Name input to IITA-TMS-IBA30572', clear => 1);
	$t->send_keys_ok('//div[contains(@class,"show")]//label[contains(text(),"New Plot Name")]/following-sibling::input', 'xpath', 'CASS_6Genotypes_206_renamed', 'Set New Plot Name input to CASS_6Genotypes_206_renamed', clear => 1);
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Update")]', 'xpath', 'Click Update Accession button with custom plot name');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Override")]', 'xpath', 'Click override button in modal');
	$t->accept_alert_ok('Accept alert after updating accession and plot name');
	$t->wait_for_network_idle();

	# Verify updated plot name and accession in plot details
	click_plot_cell_ok(3, 2);
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(.,"CASS_6Genotypes_206_renamed")]', 'xpath', 'Verify updated plot name CASS_6Genotypes_206_renamed in modal header');
	$t->find_element_ok('//div[contains(@class,"show")]//tr[td[contains(text(),"Accession")]]/td[2][contains(text(),"IITA-TMS-IBA30572")]', 'xpath', 'Verify accession name IITA-TMS-IBA30572 in details modal');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Click Close button in details modal');

	# =========================================================================
	# Accession Autocomplete Dropdown Interaction (Plot Details Modal)
	# =========================================================================
	click_plot_cell_ok(3, 2);
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(text(),"Plot Details")]', 'xpath', 'Plot details modal is open for autocomplete testing');
	$t->click_ok('//div[contains(@class,"show")]//a[contains(text(),"Replace")]', 'xpath', 'Click Replace Accession tab for autocomplete test');

	my $replace_acc_input_xpath = '//div[contains(@class,"show")]//label[contains(normalize-space(),"Accession")]/following-sibling::div//input';
	my $replace_acc_dropdown_xpath = '//div[contains(@class,"show")]//label[contains(normalize-space(),"Accession")]/following-sibling::div//ul[contains(@class,"dropdown-menu")]';

	# Verify dropdown is not displayed initially
	ok(!scalar(@{$t->driver->find_elements($replace_acc_dropdown_xpath, 'xpath')}), 'Autocomplete dropdown is not displayed when input is empty');

	# Type partial search term
	$t->send_keys_ok($replace_acc_input_xpath, 'xpath', 'IITA-TMS', 'Type IITA-TMS into New Accession input', clear => 1);

	# Verify autocomplete suggestions dropdown appears with matching accessions
	$t->find_element_ok($replace_acc_dropdown_xpath, 'xpath', 'Autocomplete suggestions dropdown appears');
	$t->find_element_ok($replace_acc_dropdown_xpath . '//li[contains(.,"IITA-TMS-IBA980581")]', 'xpath', 'Find IITA-TMS-IBA980581 in suggestions');
	$t->find_element_ok($replace_acc_dropdown_xpath . '//li[contains(.,"IITA-TMS-IBA980002")]', 'xpath', 'Find IITA-TMS-IBA980002 in suggestions');

	# Test onBlur dismissal: clicking outside the input (e.g. modal title) dismisses suggestions
	$t->click_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title")]', 'xpath', 'Click modal title to blur accession input');
	ok((wait_until {
		scalar(@{$t->driver->find_elements($replace_acc_dropdown_xpath, 'xpath')}) == 0;
	} timeout => 5, interval => 0.5), 'Autocomplete dropdown dismissed on input blur');

	# Re-type partial search term to bring back suggestions
	$t->send_keys_ok($replace_acc_input_xpath, 'xpath', 'IITA-TMS-IBA98', 'Type IITA-TMS-IBA98 into New Accession input', clear => 1);
	$t->find_element_ok($replace_acc_dropdown_xpath, 'xpath', 'Autocomplete suggestions dropdown reappears');
	$t->find_element_ok($replace_acc_dropdown_xpath . '//li[contains(.,"IITA-TMS-IBA980581")]', 'xpath', 'Find IITA-TMS-IBA980581 in suggestions again');

	# Click a suggestion from the dropdown and verify selection
	click_synthetic($replace_acc_dropdown_xpath . '//li[contains(.,"IITA-TMS-IBA980581")]');
	is($t->driver->find_element($replace_acc_input_xpath, 'xpath')->get_attribute('value'), 'IITA-TMS-IBA980581', 'Accession input populated with clicked suggestion');
	ok((wait_until {
		scalar(@{$t->driver->find_elements($replace_acc_dropdown_xpath, 'xpath')}) == 0;
	} timeout => 5, interval => 0.5), 'Autocomplete dropdown dismissed after selecting suggestion');

	# Clear the input and verify no dropdown is shown
	$t->clear_ok($replace_acc_input_xpath, 'xpath', 'Clear New Accession input');
	sleep(1);
	ok(!scalar(@{$t->driver->find_elements($replace_acc_dropdown_xpath, 'xpath')}), 'Autocomplete dropdown is not displayed when input is cleared');

	# Close Plot Details modal without submitting
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Close plot details modal after autocomplete test');

	# =========================================================================
	# Accession Autocomplete Dropdown Interaction (Dimensions Modal)
	# =========================================================================
	$t->click_ok('//button[@title="Change Dimensions"]', 'xpath', 'Click Change Dimensions button for autocomplete test');
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(text(),"Change Layout Dimensions")]', 'xpath', 'Change Layout Dimensions modal is open');

	my $filler_acc_input_xpath = '//div[contains(@class,"show")]//label[contains(text(),"Filler Accession")]/following-sibling::div//input';
	my $filler_acc_dropdown_xpath = '//div[contains(@class,"show")]//label[contains(text(),"Filler Accession")]/following-sibling::div//ul[contains(@class,"dropdown-menu")]';

	# Verify dropdown is not displayed initially
	ok(!scalar(@{$t->driver->find_elements($filler_acc_dropdown_xpath, 'xpath')}), 'Filler accession autocomplete dropdown is not displayed initially');

	# Type non-existent query to verify no dropdown appears
	$t->send_keys_ok($filler_acc_input_xpath, 'xpath', 'NONEXISTENT_ACCESSION_XYZ', 'Type non-existent term into Filler Accession input', clear => 1);
	sleep(1);
	ok(!scalar(@{$t->driver->find_elements($filler_acc_dropdown_xpath, 'xpath')}), 'Filler accession autocomplete dropdown is not displayed for non-existent query');

	# Type partial search term
	$t->send_keys_ok($filler_acc_input_xpath, 'xpath', 'TMEB', 'Type TMEB into Filler Accession input', clear => 1);

	# Verify suggestions dropdown appears
	$t->find_element_ok($filler_acc_dropdown_xpath, 'xpath', 'Filler accession autocomplete suggestions dropdown appears');
	$t->find_element_ok($filler_acc_dropdown_xpath . '//li[contains(.,"TMEB693")]', 'xpath', 'Find TMEB693 in filler accession suggestions');

	# Click suggestion item and verify selection
	click_synthetic($filler_acc_dropdown_xpath . '//li[contains(.,"TMEB693")]');
	is($t->driver->find_element($filler_acc_input_xpath, 'xpath')->get_attribute('value'), 'TMEB693', 'Filler Accession input populated with clicked suggestion');
	ok((wait_until {
		scalar(@{$t->driver->find_elements($filler_acc_dropdown_xpath, 'xpath')}) == 0;
	} timeout => 5, interval => 0.5), 'Filler accession dropdown dismissed after selecting suggestion');

	# Clear the Filler Accession input before canceling so no state lingers
	$t->clear_ok($filler_acc_input_xpath, 'xpath', 'Clear Filler Accession input before canceling modal');

	# Cancel and close Change Dimensions modal
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Cancel")]', 'xpath', 'Cancel and close Change Dimensions modal');
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"show")]//h4[contains(text(),"Change Layout Dimensions")]', 'xpath')}), 'Change Layout Dimensions modal is closed');

	# =========================================================================
	# Double-Click Plot Navigation
	# =========================================================================
	my $plot_206 = $f->bcs_schema->resultset('Stock::Stock')->find({ uniquename => 'CASS_6Genotypes_206_renamed' })
		|| $f->bcs_schema->resultset('Stock::Stock')->find({ uniquename => 'CASS_6Genotypes_206' });
	my $plot_206_id = $plot_206 ? $plot_206->stock_id : undef;
	ok($plot_206_id, "Found stock ID for plot 206: $plot_206_id");

	# Hook window.open to track URLs passed from PlotLayer double click
	setup_window_open_handler();
	$t->driver->execute_script('window.__lastOpenedUrl = null;');

	my $orig_handle = $t->driver->get_current_window_handle();
	my @handles_before = @{$t->driver->get_window_handles()};

	double_click_plot_cell_ok(3, 2);

	# Wait past the 250ms single-click timer
	sleep(1);

	my $opened_url = $t->driver->execute_script('return window.__lastOpenedUrl;');
	is($opened_url, "/stock/$plot_206_id/view", "Verify window.open called with /stock/$plot_206_id/view on double click");
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"show")]//h4[contains(text(),"Plot Details")]', 'xpath')}), 'Plot Details modal did not open on double click');

	# If a new window or tab was opened, verify its URL, close it, and switch back
	my $has_new_window = eval {
		wait_until {
			scalar(@{$t->driver->get_window_handles()}) > scalar(@handles_before);
		} timeout => 5;
	};

	if ($has_new_window) {
		my @handles_after = @{$t->driver->get_window_handles()};
		my ($new_handle) = grep { $_ ne $orig_handle } @handles_after;
		if ($new_handle) {
			$t->driver->switch_to_window($new_handle);
			eval {
				wait_until {
					my $url = $t->driver->get_current_url();
					return $url && $url =~ m{/stock/$plot_206_id/view};
				} timeout => 10;
			};
			like($t->driver->get_current_url(), qr{/stock/$plot_206_id/view}, "New window URL contains /stock/$plot_206_id/view");
			$t->driver->close();
			$t->driver->switch_to_window($orig_handle);
		}
	}

	# Verify normal single click still opens details modal afterwards
	click_plot_cell_ok(3, 2);
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(.,"CASS_6Genotypes_206")]', 'xpath', 'Plot details modal opens on single click after double-click test');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Close plot details modal');

	# =========================================================================
	# Column Inversion, Layout Rotation, & North Arrow Tracking
	# =========================================================================
	$t->click_ok('//label[contains(text(),"Invert Columns")]/input', 'xpath', 'Click Invert Columns checkbox');
	find_plot_label_ok('207', 1, 2);
	find_north_arrow_ok(270);

	$t->click_ok('//button[@title="Rotate"]', 'xpath', 'Click Rotate button');
	find_plot_label_ok('207', 5, 0);
	find_north_arrow_ok(0);

	# =========================================================================
	# Submit Layout Changes & Verify Persistence on Page Reload
	# =========================================================================
	# Test canceling the submission confirm prompt
	$t->click_ok('//button[contains(text(),"Submit Layout Changes")]', 'xpath', 'Click Submit Layout Changes button to test cancellation');
	my $confirm_prompt = $t->get_alert_text();
	like($confirm_prompt, qr/save this plot layout to the database/i, 'Verify layout submission confirmation prompt text');
	$t->driver->dismiss_alert();

	# Configure distinct layout settings and submit
	set_color_by('germplasm');
	set_label_by('germplasm');
	set_label_size(12);
	set_north_arrow_angle(60);
	set_secondary_axis('Saved Sec X', 'Saved Sec Y', 'sx1,sx2,sx3,sx4', 'sy1,sy2,sy3,sy4');

	# Ensure Invert Rows and Invert Columns are checked
	my $invert_rows_elem = $t->driver->find_element('//label[contains(text(),"Invert Rows")]/input', 'xpath');
	$t->click_ok('//label[contains(text(),"Invert Rows")]/input', 'xpath', 'Check Invert Rows') unless $invert_rows_elem->is_selected();
	my $invert_cols_elem = $t->driver->find_element('//label[contains(text(),"Invert Columns")]/input', 'xpath');
	$t->click_ok('//label[contains(text(),"Invert Columns")]/input', 'xpath', 'Check Invert Columns') unless $invert_cols_elem->is_selected();

	# Ensure Top and Left borders are checked, Bottom and Right unchecked
	my $top_border_elem = $t->driver->find_element('//label[contains(text(),"Top")]/input', 'xpath');
	$t->click_ok('//label[contains(text(),"Top")]/input', 'xpath', 'Check Top border') unless $top_border_elem->is_selected();
	my $left_border_elem = $t->driver->find_element('//label[contains(text(),"Left")]/input', 'xpath');
	$t->click_ok('//label[contains(text(),"Left")]/input', 'xpath', 'Check Left border') unless $left_border_elem->is_selected();
	my $right_border_elem = $t->driver->find_element('//label[contains(text(),"Right")]/input', 'xpath');
	$t->click_ok('//label[contains(text(),"Right")]/input', 'xpath', 'Uncheck Right border') if $right_border_elem->is_selected();

	# Confirm and submit layout
	$t->click_ok('//button[contains(text(),"Submit Layout Changes")]', 'xpath', 'Click Submit Layout Changes button');
	$confirm_prompt = $t->get_alert_text();
	like($confirm_prompt, qr/save this plot layout to the database/i, 'Verify confirmation prompt before submitting');
	$t->accept_alert_ok('Accept layout submission confirmation prompt');
	my $success_alert = $t->get_alert_text();
	is($success_alert, 'Field Plot layout submitted successfully!', 'Verify alert text for successful layout submission');
	$t->accept_alert_ok('Accept layout submission success alert');
	$t->wait_for_network_idle();

	# Reload page and verify all submitted changes were persisted to database
	$t->get_ok('/breeders/trial/165', 'Reload trial 165 page to verify persistence');
	$t->click_ok('pheno_heatmap_onswitch', 'id', 'Open fieldmap section on reloaded page');
	$t->wait_for_working_dialog();
	$t->find_element_ok('//*[@id="' . $svg_id . '"]', 'xpath', 'Find fieldmap SVG on reloaded page');

	is($t->driver->find_element('//label[contains(text(),"Color By:")]/following-sibling::select', 'xpath')->get_attribute('value'), 'germplasm', 'Persisted Color By is germplasm');
	is($t->driver->find_element('//label[contains(text(),"Label By:")]/following-sibling::select', 'xpath')->get_attribute('value'), 'germplasm', 'Persisted Label By is germplasm');
	is($t->driver->find_element('//label[contains(text(),"Label Size:")]/following-sibling::input', 'xpath')->get_attribute('value'), '12', 'Persisted Label Size is 12');
	is($t->driver->find_element('//label[contains(text(),"North Angle")]/following-sibling::input', 'xpath')->get_attribute('value'), '60', 'Persisted North Angle input is 60');
	ok($t->driver->find_element('//label[contains(text(),"Invert Rows")]/input', 'xpath')->is_selected(), 'Persisted Invert Rows is checked');
	ok($t->driver->find_element('//label[contains(text(),"Invert Columns")]/input', 'xpath')->is_selected(), 'Persisted Invert Columns is checked');
	ok($t->driver->find_element('//label[contains(text(),"Top")]/input', 'xpath')->is_selected(), 'Persisted Top border is checked');
	ok($t->driver->find_element('//label[contains(text(),"Left")]/input', 'xpath')->is_selected(), 'Persisted Left border is checked');
	find_north_arrow_ok(240);

	# Verify persisted secondary axis labels and active offset
	$t->find_element_ok('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="Saved Sec X"]', 'xpath', 'Find persisted secondary x axis label Saved Sec X');
	$t->find_element_ok('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="Saved Sec Y"]', 'xpath', 'Find persisted secondary y axis label Saved Sec Y');
	$t->find_element_ok('//*[local-name()="svg" and @id="' . $svg_id . '"]/*[local-name()="g" and @transform="translate(80, 55)"]', 'xpath', 'Grid group transform offset is (80, 55) when secondary axis is active');

	# =========================================================================
	# Clear Secondary Axis & Verify Persistence
	# =========================================================================
	clear_secondary_axis();

	# Verify secondary axis elements removed from SVG
	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="Saved Sec X"]', 'xpath')}), 'No secondary X label in SVG after clearing');
	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="Saved Sec Y"]', 'xpath')}), 'No secondary Y label in SVG after clearing');
	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="sx1"]', 'xpath')}), 'No secondary X value sx1 in SVG after clearing');
	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="sy1"]', 'xpath')}), 'No secondary Y value sy1 in SVG after clearing');
	$t->find_element_ok('//*[local-name()="svg" and @id="' . $svg_id . '"]/*[local-name()="g" and @transform="translate(50, 25)"]', 'xpath', 'Grid group transform offset reset to (50, 25) after clearing secondary axis');

	# Re-open Change Secondary Axis modal to verify inputs are empty
	$t->click_ok('//button[@title="Change Secondary Axis"]', 'xpath', 'Re-open Change Secondary Axis modal');
	is($t->driver->find_element('//label[contains(text(),"Secondary X Axis Label")]/following-sibling::input', 'xpath')->get_attribute('value'), '', 'Secondary X Axis Label input is empty');
	is($t->driver->find_element('//label[contains(text(),"Secondary Y Axis Label")]/following-sibling::input', 'xpath')->get_attribute('value'), '', 'Secondary Y Axis Label input is empty');
	is($t->driver->find_element('//label[contains(text(),"Secondary X Axis Values")]/following-sibling::input', 'xpath')->get_attribute('value'), '', 'Secondary X Axis Values input is empty');
	is($t->driver->find_element('//label[contains(text(),"Secondary Y Axis Values")]/following-sibling::input', 'xpath')->get_attribute('value'), '', 'Secondary Y Axis Values input is empty');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Cancel")]', 'xpath', 'Close Change Secondary Axis modal');

	# Submit layout changes to persist cleared secondary axis to database
	$t->click_ok('//button[contains(text(),"Submit Layout Changes")]', 'xpath', 'Click Submit Layout Changes to save cleared secondary axis');
	$t->accept_alert_ok('Accept layout submission confirmation prompt');
	my $clear_sec_alert = $t->get_alert_text();
	is($clear_sec_alert, 'Field Plot layout submitted successfully!', 'Verify alert text for successful layout submission with cleared secondary axis');
	$t->accept_alert_ok('Accept layout submission success alert');
	$t->wait_for_network_idle();

	# Reload page and verify secondary axis remains cleared in database and UI
	$t->get_ok('/breeders/trial/165', 'Reload trial 165 page to verify persistence of cleared secondary axis');
	$t->click_ok('pheno_heatmap_onswitch', 'id', 'Open fieldmap section on reloaded page');
	$t->wait_for_working_dialog();
	$t->find_element_ok('//*[@id="' . $svg_id . '"]', 'xpath', 'Find fieldmap SVG on reloaded page');

	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="Saved Sec X"]', 'xpath')}), 'No secondary X label after reload');
	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="Saved Sec Y"]', 'xpath')}), 'No secondary Y label after reload');
	$t->find_element_ok('//*[local-name()="svg" and @id="' . $svg_id . '"]/*[local-name()="g" and @transform="translate(50, 25)"]', 'xpath', 'Grid group transform offset remains (50, 25) after reload');

	# Verify external header button (#trial_fieldmap_download_layout_button) opens Download CSV modal now that layout has coordinates
	$t->click_ok('trial_fieldmap_download_layout_button', 'id', 'Click external Download Spatial Layout button in section header');
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(text(),"Download Spatial Layout Customizer")]', 'xpath', 'Download Spatial Layout Customizer modal is open via external header button');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Click Close button in Download CSV modal opened via external button');
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"show")]//h4[contains(text(),"Download Spatial Layout Customizer")]', 'xpath')}), 'Download CSV modal is closed after clicking Close');

	# =========================================================================
	# Print Field Map Action (Field Map View)
	# =========================================================================
	test_print_field_map_ok('Field Map View');

	# =========================================================================
	# "Display Trials in Same Field" Multi-Trial Visualization
	# =========================================================================
	# Mark test_location as a "Field" to link co-located trials
	$f->dbh->do(<<'EOSQL');
INSERT INTO public.nd_geolocationprop (nd_geolocation_id, type_id, value, rank)
VALUES (23, 77158, 'Field', 0)
EOSQL

	$t->wait_for_network_idle();
	$t->get_ok('/breeders/trial/139', 'Navigate to trial 139 page');
	$t->click_ok('pheno_heatmap_onswitch', 'id', 'Open fieldmap section for trial 139');
	$t->wait_for_working_dialog();
	$t->find_element_ok('//*[@id="' . $svg_id . '"]', 'xpath', 'Find fieldmap SVG on trial 139');

	# Verify initial state of "Display Trials in Same Field"
	$t->find_element_ok('//label[contains(text(),"Display Trials in Same Field")]/input', 'xpath', 'Find Display Trials in Same Field checkbox');
	ok(!$t->driver->find_element('//label[contains(text(),"Display Trials in Same Field")]/input', 'xpath')->is_selected(), 'Display Trials in Same Field checkbox is initially unchecked');
	ok(!scalar(@{$t->driver->find_elements('//strong[contains(text(),"Trials in Same Field:")]', 'xpath')}), 'Trials in Same Field header is not displayed initially');

	# Enable "Display Trials in Same Field"
	$t->click_ok('//label[contains(text(),"Display Trials in Same Field")]/input', 'xpath', 'Check Display Trials in Same Field checkbox');
	$t->wait_for_working_dialog();

	# Verify linked trial badges in header panel
	$t->find_element_ok('//strong[contains(text(),"Trials in Same Field:")]', 'xpath', 'Find Trials in Same Field header');
	$t->find_element_ok('//span[contains(text(),"Kasese solgs trial")]', 'xpath', 'Find badge for Kasese solgs trial');
	$t->find_element_ok('//span[contains(text(),"test_trial")]', 'xpath', 'Find badge for test_trial');
	$t->find_element_ok('//span[contains(text(),"trial2 NaCRRI")]', 'xpath', 'Find badge for trial2 NaCRRI');

	# Verify multiple trial colored bands in the SVG plots
	$t->find_element_ok('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="rect" and @fill="#2f4f4f" and @height="4"]', 'xpath', 'Find plot band for Kasese solgs trial (#2f4f4f)');
	$t->find_element_ok('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="rect" and @fill="#ff8c00" and @height="4"]', 'xpath', 'Find plot band for test_trial (#ff8c00)');
	$t->find_element_ok('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="rect" and @fill="#ffff00" and @height="4"]', 'xpath', 'Find plot band for trial2 NaCRRI (#ffff00)');

	# Interactive Hover Tooltip in Multi-Trial View
	my $multi_trial_plot_xpath = '//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="g"][.//*[local-name()="rect" and @height="4"]]';
	hover_element($multi_trial_plot_xpath);
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Trial Name:")]', 'xpath', 'Tooltip displays Trial Name header in multi-trial view');
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Trial Name:")]/following-sibling::span', 'xpath', 'Tooltip displays colored Trial Name badge');
	unhover_element($multi_trial_plot_xpath);
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"fieldmap-tooltip")]', 'xpath')}), 'Tooltip dismissed after unhover in multi-trial view');

	# Verify controls disabled while linked trials are displayed
	$t->find_element_ok('//label[contains(text(),"Plot Layout:")]/following-sibling::select[@disabled]', 'xpath', 'Plot Layout select is disabled');
	$t->find_element_ok('//label[contains(text(),"Top")]/input[@disabled]', 'xpath', 'Top border checkbox is disabled');
	$t->find_element_ok('//label[contains(text(),"Bottom")]/input[@disabled]', 'xpath', 'Bottom border checkbox is disabled');
	$t->find_element_ok('//label[contains(text(),"Left")]/input[@disabled]', 'xpath', 'Left border checkbox is disabled');
	$t->find_element_ok('//label[contains(text(),"Right")]/input[@disabled]', 'xpath', 'Right border checkbox is disabled');
	$t->find_element_ok('//button[@title="Transpose Display" and @disabled]', 'xpath', 'Transpose button is disabled');
	$t->find_element_ok('//button[@title="Rotate" and @disabled]', 'xpath', 'Rotate button is disabled');
	$t->find_element_ok('//button[@title="Change Dimensions" and @disabled]', 'xpath', 'Change Dimensions button is disabled');
	$t->find_element_ok('//button[@title="Change Secondary Axis" and @disabled]', 'xpath', 'Change Secondary Axis button is disabled');
	$t->find_element_ok('//button[contains(text(),"Submit Layout Changes") and @disabled]', 'xpath', 'Submit Layout Changes button is disabled');

	# Disable "Display Trials in Same Field" and verify re-enabled controls
	$t->click_ok('//label[contains(text(),"Display Trials in Same Field")]/input', 'xpath', 'Uncheck Display Trials in Same Field checkbox');
	$t->wait_for_working_dialog();

	ok(!scalar(@{$t->driver->find_elements('//strong[contains(text(),"Trials in Same Field:")]', 'xpath')}), 'Trials in Same Field header is hidden after unchecking');
	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="rect" and @fill="#ff8c00" and @height="4"]', 'xpath')}), 'Plot bands for other trials are removed');
	$t->find_element_ok('//label[contains(text(),"Plot Layout:")]/following-sibling::select[not(@disabled)]', 'xpath', 'Plot Layout select is re-enabled');
	$t->find_element_ok('//label[contains(text(),"Top")]/input[not(@disabled)]', 'xpath', 'Top border checkbox is re-enabled');
	$t->find_element_ok('//label[contains(text(),"Bottom")]/input[not(@disabled)]', 'xpath', 'Bottom border checkbox is re-enabled');
	$t->find_element_ok('//label[contains(text(),"Left")]/input[not(@disabled)]', 'xpath', 'Left border checkbox is re-enabled');
	$t->find_element_ok('//label[contains(text(),"Right")]/input[not(@disabled)]', 'xpath', 'Right border checkbox is re-enabled');
	$t->find_element_ok('//button[@title="Transpose Display" and not(@disabled)]', 'xpath', 'Transpose button is re-enabled');
	$t->find_element_ok('//button[@title="Rotate" and not(@disabled)]', 'xpath', 'Rotate button is re-enabled');
	$t->find_element_ok('//button[@title="Change Dimensions" and not(@disabled)]', 'xpath', 'Change Dimensions button is re-enabled');
	$t->find_element_ok('//button[@title="Change Secondary Axis" and not(@disabled)]', 'xpath', 'Change Secondary Axis button is re-enabled');
	$t->find_element_ok('//button[contains(text(),"Submit Layout Changes") and not(@disabled)]', 'xpath', 'Submit Layout Changes button is re-enabled');

	# =========================================================================
	# Filler Accession Validation & Creation
	# =========================================================================
	$t->wait_for_network_idle();
	$t->get_ok('/breeders/trial/165', 'Navigate to trial 165 for filler accession tests');
	$t->click_ok('pheno_heatmap_onswitch', 'id', 'Open fieldmap section');
	$t->wait_for_working_dialog();
	$t->find_element_ok('//*[@id="' . $svg_id . '"]', 'xpath', 'Find fieldmap SVG');

	# Reset invert flags and borders to establish standard orientation
	my $inv_rows = $t->driver->find_element('//label[contains(text(),"Invert Rows")]/input', 'xpath');
	$t->click_ok('//label[contains(text(),"Invert Rows")]/input', 'xpath', 'Uncheck Invert Rows') if $inv_rows->is_selected();
	my $inv_cols = $t->driver->find_element('//label[contains(text(),"Invert Columns")]/input', 'xpath');
	$t->click_ok('//label[contains(text(),"Invert Columns")]/input', 'xpath', 'Uncheck Invert Columns') if $inv_cols->is_selected();
	my $top_b = $t->driver->find_element('//label[contains(text(),"Top")]/input', 'xpath');
	$t->click_ok('//label[contains(text(),"Top")]/input', 'xpath', 'Uncheck Top border') if $top_b->is_selected();
	my $left_b = $t->driver->find_element('//label[contains(text(),"Left")]/input', 'xpath');
	$t->click_ok('//label[contains(text(),"Left")]/input', 'xpath', 'Uncheck Left border') if $left_b->is_selected();
	my $bottom_b = $t->driver->find_element('//label[contains(text(),"Bottom")]/input', 'xpath');
	$t->click_ok('//label[contains(text(),"Bottom")]/input', 'xpath', 'Uncheck Bottom border') if $bottom_b->is_selected();
	my $right_b = $t->driver->find_element('//label[contains(text(),"Right")]/input', 'xpath');
	$t->click_ok('//label[contains(text(),"Right")]/input', 'xpath', 'Uncheck Right border') if $right_b->is_selected();
	$t->click_option_ok('//label[contains(text(),"Plot Layout:")]/following-sibling::select/option[@value="serpentine"]', 'xpath', 'Select Serpentine plot layout');

	# Expand dimensions to 6 columns x 4 rows (24 cells total for 21 plots = 3 empty slots)
	set_dimensions(6, 4);
	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="g" and @transform="translate(0, 0)"]/*[local-name()="rect"]', 'xpath')}), 'Empty space cell (0, 0) has no rect');

	# Test invalid filler accession error handling
	set_dimensions(6, 4, 'NONEXISTENT_FILLER_ACCESSION_XYZ');
	my $invalid_filler_alert = $t->get_alert_text();
	like($invalid_filler_alert, qr/(?:not exist|not found|error)/i, 'Verify alert text when filler accession does not exist');
	$t->accept_alert_ok('Accept invalid filler accession alert');
	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="g" and @transform="translate(0, 0)"]/*[local-name()="rect"]', 'xpath')}), 'Empty space cell (0, 0) still has no rect after invalid filler accession');

	# Apply valid filler accession and verify filler plots rendered
	set_dimensions(6, 4, 'IITA-TMS-IBA980581');
	find_plot_cell_ok(0, 0, $border_fill);
	find_plot_cell_ok(1, 0, $border_fill);
	find_plot_cell_ok(2, 0, $border_fill);

	# Verify details modal for unsaved filler plot
	click_plot_cell_ok(0, 0);
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(.,"Filler")]', 'xpath', 'Plot details modal opens for unsaved filler plot');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Close plot details modal');

	# Submit layout changes to create filler plots in the database
	$t->click_ok('//button[contains(text(),"Submit Layout Changes")]', 'xpath', 'Click Submit Layout Changes button to create filler plots');
	my $confirm_filler_prompt = $t->get_alert_text();
	like($confirm_filler_prompt, qr/save this plot layout to the database/i, 'Verify confirmation prompt before submitting filler plots');
	$t->accept_alert_ok('Accept layout submission confirmation prompt');
	my $filler_success_alert = $t->get_alert_text();
	is($filler_success_alert, 'Field Plot layout submitted successfully!', 'Verify alert text for successful layout submission with filler plots');
	$t->accept_alert_ok('Accept layout submission success alert');
	$t->wait_for_network_idle();

	# Verify newly created filler plot details
	click_plot_cell_ok(0, 0);
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(.,"165 filler")]', 'xpath', 'Verify saved filler plot name in modal header');
	$t->find_element_ok('//div[contains(@class,"show")]//tr[td[contains(text(),"Accession")]]/td[2][contains(text(),"IITA-TMS-IBA980581")]', 'xpath', 'Verify filler accession name IITA-TMS-IBA980581 in details modal');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Close plot details modal');

	# Verify persistence across page reload
	$t->wait_for_network_idle();
	$t->get_ok('/breeders/trial/165', 'Reload trial 165 page to verify persistence of filler plots');
	$t->click_ok('pheno_heatmap_onswitch', 'id', 'Open fieldmap section on reloaded page');
	$t->wait_for_working_dialog();
	$t->find_element_ok('//*[@id="' . $svg_id . '"]', 'xpath', 'Find fieldmap SVG on reloaded page');
	find_plot_cell_ok(0, 0, $palette[4]);
	click_plot_cell_ok(0, 0);
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(.,"165 filler")]', 'xpath', 'Verify persisted filler plot name in modal header after reload');
	$t->find_element_ok('//div[contains(@class,"show")]//tr[td[contains(text(),"Accession")]]/td[2][contains(text(),"IITA-TMS-IBA980581")]', 'xpath', 'Verify persisted filler accession name in details modal after reload');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Close plot details modal');

	# =========================================================================
	# Details Modal with Subplots
	# =========================================================================
	# Configure trial with subplots (1 subplot per plot)
	$t->click_ok('trial_design_section_onswitch', 'id', 'Open trial design section');
	$t->click_ok('trial_subplots_onswitch', 'id', 'Open subplots section');
	$t->click_ok('create_subplot_entries_button', 'id', 'Click Add subplot entries button');
	$t->send_keys_ok('add_subplots_per_plot_num', 'id', '1', 'Set number of subplots per plot to 1');
	$t->click_ok('add_subplots_save_button', 'id', 'Click Save button to create subplots');
	$t->accept_alert_ok('Accept alert after creating subplots');
	$t->wait_for_network_idle();

	# Configure subplots with plants (3 rows x 3 columns = 9 plants per subplot)
	$t->click_ok('trial_design_section_onswitch', 'id', 'Re-open trial design section');
	$t->click_ok('trial_plants_onswitch', 'id', 'Open plants section');
	$t->click_ok('create_plant_entries_subplots_button', 'id', 'Click Add plant entries button for subplots');
	$t->send_keys_ok('add_plants_per_subplot_num', 'id', '9', 'Set number of plants per subplot to 9');
	$t->click_ok('add_rows_and_columns_to_subplot_plants', 'id', 'Click Assign row and column data checkbox');
	$t->send_keys_ok('rows_per_subplot', 'id', '3', 'Set number of rows per subplot to 3');
	$t->send_keys_ok('cols_per_subplot', 'id', '3', 'Set number of columns per subplot to 3');
	$t->click_ok('add_plants_subplot_save_button', 'id', 'Click Save button to create plants for subplots');
	$t->accept_alert_ok('Accept alert after creating plants for subplots');
	$t->wait_for_network_idle();

	# Open fieldmap to verify plot details modal with subplots
	$t->click_ok('pheno_heatmap_onswitch', 'id', 'Open fieldmap section');
	$t->wait_for_working_dialog();
	$t->find_element_ok('//*[@id="' . $svg_id . '"]', 'xpath', 'Find fieldmap SVG');

	# Click plot cell to open details modal
	click_plot_cell_ok(3, 2);
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(text(),"Plot Details")]', 'xpath', 'Plot details modal is open');
	$t->find_element_ok('//h5[contains(text(),"Plot Contents & Structure Hierarchy:")]', 'xpath', 'Verify Plot Contents & Structure Hierarchy heading');

	# Verify subplot structure and 3x3 plant coordinate grid
	$t->find_element_ok('//div[contains(@class,"show")]//table[contains(@class,"plant-grid-table")]', 'xpath', 'Find subplot plant grid table');
	$t->find_element_ok('//div[contains(@class,"show")]//table[contains(@class,"plant-grid-table")]//th[text()="3"]', 'xpath', 'Find plant grid row/column header 3');
	my $plant_cells = $t->driver->find_elements('//div[contains(@class,"show")]//td[contains(@class,"plant-grid-cell")]', 'xpath');
	is(scalar(@$plant_cells), 9, 'Subplot grid contains 9 plant cells');
	$t->find_element_ok('//div[contains(@class,"show")]//pre[contains(text(),"subplot")]', 'xpath', 'Verify subplot hierarchy in JSON pre block');

	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Close plot details modal');

	# =========================================================================
	# Plot Camera Icon & Images
	# =========================================================================
	# Verify legend displays "Plot Has Image" item
	$t->find_element_ok('//div[@id="legend_list"]//span[contains(normalize-space(),"Plot Has Image")]', 'xpath', 'Find "Plot Has Image" item in legend');
	$t->find_element_ok('//div[@id="legend_list"]//span[contains(normalize-space(),"Plot Has Image")]//img[contains(@src,"plot_images.png")]', 'xpath', 'Find camera icon image in legend');

	# Verify no camera icon exists on plot cells before image upload
	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="rect" and @fill="#ff8c00"]', 'xpath')}), 'No camera icons on plots initially');

	# Prepare test image using Fieldbook App naming pattern: <observationUnitName>_<traitname>_<number>_<timestamp>.jpg
	my $image_filename = 'CASS_6Genotypes_103_rootquality_1_2024-01-01-12-00-00.jpg';
	my $source_image   = $f->config->{basepath} . '/t/data/cassava_image.jpg';
	my $temp_image     = "/tmp/$image_filename";
	copy($source_image, $temp_image) or die "Could not copy $source_image to $temp_image: $!";

	# Open the image upload dialog via trial images section button
	$t->click_ok('trial_images_section_onswitch', 'id', 'Open trial images section');
	$t->wait_for_working_dialog();
	$t->click_ok('upload_images_link', 'id', 'Click Add New Image button to open upload modal');

	# Upload and verify image file
	my $upload_path = eval { $t->driver->upload_file($temp_image) } || $temp_image;
	$t->send_keys_ok('upload_images_file_input', 'id', $upload_path, 'Input image filename');
	$t->driver->execute_script(q{
		document.getElementById('upload_images_file_input').dispatchEvent(new Event('input', { bubbles: true }));
	});

	$t->click_ok('upload_images_submit_verify', 'id', 'Click Verify button in upload modal');
	$t->wait_for_working_dialog();

	$t->find_element_ok('//div[@id="upload_images_status"]//li[contains(@class,"list-group-item-success")]', 'xpath', 'Image verification success message displayed');
	$t->find_element_ok('//button[@id="upload_images_submit_store" and not(@disabled)]', 'xpath', 'Store button is enabled after verification');

	# Store the verified image
	$t->click_ok('upload_images_submit_store', 'id', 'Click Store button in upload modal');
	ok((wait_until {
		scalar(@{$t->driver->find_elements('//div[@id="upload_images_status"]//li[contains(@class,"list-group-item-success") and contains(.,"uploaded image")]', 'xpath')}) > 0;
	} timeout => 30, interval => 1), 'Wait for image upload and store to complete');

	$t->click_ok('//div[@id="upload_images_dialog"]//button[contains(text(),"Close")]', 'xpath', 'Close upload images modal');
	unlink $temp_image if -e $temp_image;

	# Refresh cache and reload trial page to view updated fieldmap with image
	$t->driver->execute_script(q{
		jQuery.ajax({
			url: '/ajax/breeders/trial/165/refresh_cache',
			type: 'POST',
			async: false
		});
	});

	$t->wait_for_network_idle();
	$t->get_ok('/breeders/trial/165', 'Reload trial 165 page to view updated fieldmap with image');
	$t->click_ok('pheno_heatmap_onswitch', 'id', 'Open fieldmap section');
	$t->wait_for_working_dialog();
	$t->find_element_ok('//*[@id="' . $svg_id . '"]', 'xpath', 'Find fieldmap SVG on reloaded page');

	# Verify orange camera icon badge rendered on plot tile CASS_6Genotypes_103
	$t->find_element_ok('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="rect" and @fill="#ff8c00"]', 'xpath', 'Find orange camera icon on plot tile');
	$t->find_element_ok('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="g" and @transform="translate(5, 5) scale(0.6)"]/*[local-name()="circle" and @fill="#ffffff"]', 'xpath', 'Find white lens circle of camera icon');

	# Click the plot tile with the camera icon and verify image display in Plot Details modal
	$t->click_ok('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="g"][.//*[local-name()="rect" and @fill="#ff8c00"]]/*[local-name()="rect" and @width="50"]', 'xpath', 'Click plot square that has camera icon');
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(.,"CASS_6Genotypes_103")]', 'xpath', 'Verify plot details modal opened for CASS_6Genotypes_103');

	ok((wait_until {
		scalar(@{$t->driver->find_elements('//div[contains(@class,"show")]//h5[strong[contains(text(),"Plot Images:")]]', 'xpath')}) > 0;
	} timeout => 15, interval => 1), 'Wait for Plot Images section to appear in details modal');
	$t->find_element_ok('//div[contains(@class,"show")]//h5[strong[contains(text(),"Plot Images:")]]', 'xpath', 'Verify Plot Images heading displayed');
	$t->find_element_ok('//div[contains(@class,"show")]//h5[strong[contains(text(),"Plot Images:")]]/following-sibling::div//img', 'xpath', 'Verify plot image thumbnail rendered in details modal');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Close plot details modal');

	# Verify uploaded image is also listed in Trial Images section table
	$t->click_ok('trial_images_section_onswitch', 'id', 'Open trial images section to verify image table');
	$t->wait_for_working_dialog();
	ok((wait_until {
		scalar(@{$t->driver->find_elements('//table[@id="plot_images_results"]//td[contains(.,"CASS_6Genotypes_103")]', 'xpath')}) > 0;
	} timeout => 15, interval => 1), 'Verify uploaded image listed in Trial Images table');

	# =========================================================================
	# Alternative Stock Type: Cross
	# =========================================================================
	my $cross_trial_id = create_trial_with_stock_type(
		'Test_Cross_Fieldmap_Trial',
		'cross',
		['TEST_CROSS_01', 'TEST_CROSS_02', 'TEST_CROSS_03', 'TEST_CROSS_04']
	);

	$t->wait_for_network_idle();
	$t->get_ok("/breeders/trial/$cross_trial_id", 'Navigate to created cross trial page');
	$t->click_ok('pheno_heatmap_onswitch', 'id', 'Open fieldmap section on cross trial');
	$t->wait_for_working_dialog();
	$t->find_element_ok('//*[@id="' . $svg_id . '"]', 'xpath', 'Find fieldmap SVG on cross trial');

	# Verify "Cross" in Color By dropdown
	$t->find_element_ok('//label[contains(text(),"Color By:")]/following-sibling::select/option[@value="germplasm" and text()="Cross"]', 'xpath', 'Find "Cross" option in Color By select');

	# Verify "Cross Name" in Label By dropdown
	$t->find_element_ok('//label[contains(text(),"Label By:")]/following-sibling::select/option[@value="germplasm" and normalize-space()="Cross Name"]', 'xpath', 'Find "Cross Name" option in Label By select');

	# Label by Cross Name and verify labels in SVG
	set_label_by('germplasm');
	find_plot_label_ok('TEST_CROSS_01', 0, 1, staggered => 1);
	find_plot_label_ok('TEST_CROSS_02', 1, 1, staggered => 1);
	find_plot_label_ok('TEST_CROSS_03', 0, 0, staggered => 1);
	find_plot_label_ok('TEST_CROSS_04', 1, 0, staggered => 1);

	# Click plot cell to open details modal
	click_plot_cell_ok(0, 1);
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(text(),"Plot Details")]', 'xpath', 'Plot details modal is open for cross plot');
	$t->find_element_ok('//div[contains(@class,"show")]//tr[td[contains(normalize-space(),"Cross Name:")]]/td[2][contains(normalize-space(),"TEST_CROSS_01")]', 'xpath', 'Verify Cross Name displayed in summary table');
	$t->find_element_ok('//div[contains(@class,"show")]//a[contains(normalize-space(),"Replace Cross")]', 'xpath', 'Verify "Replace Cross" tab title');

	# Switch to Replace Cross tab and verify labels
	$t->click_ok('//div[contains(@class,"show")]//a[contains(normalize-space(),"Replace Cross")]', 'xpath', 'Click Replace Cross tab');
	$t->find_element_ok('//div[contains(@class,"show")]//label[contains(normalize-space(),"New Cross Name:")]', 'xpath', 'Verify "New Cross Name:" label');
	$t->find_element_ok('//div[contains(@class,"show")]//button[contains(normalize-space(),"Update Cross")]', 'xpath', 'Verify "Update Cross" button');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Close plot details modal for cross plot');

	# Interactive Hover Tooltip for Cross Plot
	hover_plot_cell(0, 1);
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip") and contains(.,"TEST_CROSS_01")]', 'xpath', 'Tooltip displays cross name on hover');
	unhover_plot_cell(0, 1);
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"fieldmap-tooltip")]', 'xpath')}), 'Tooltip dismissed after unhover from cross plot');

	# =========================================================================
	# Alternative Stock Type: Family
	# =========================================================================
	my $family_trial_id = create_trial_with_stock_type(
		'Test_Family_Fieldmap_Trial',
		'family_name',
		['TEST_FAMILY_01', 'TEST_FAMILY_02', 'TEST_FAMILY_03', 'TEST_FAMILY_04']
	);

	$t->wait_for_network_idle();
	$t->get_ok("/breeders/trial/$family_trial_id", 'Navigate to created family trial page');
	$t->click_ok('pheno_heatmap_onswitch', 'id', 'Open fieldmap section on family trial');
	$t->wait_for_working_dialog();
	$t->find_element_ok('//*[@id="' . $svg_id . '"]', 'xpath', 'Find fieldmap SVG on family trial');

	# Verify "Family" in Color By dropdown
	$t->find_element_ok('//label[contains(text(),"Color By:")]/following-sibling::select/option[@value="germplasm" and text()="Family"]', 'xpath', 'Find "Family" option in Color By select');

	# Verify "Family Name" in Label By dropdown
	$t->find_element_ok('//label[contains(text(),"Label By:")]/following-sibling::select/option[@value="germplasm" and normalize-space()="Family Name"]', 'xpath', 'Find "Family Name" option in Label By select');

	# Label by Family Name and verify labels in SVG
	set_label_by('germplasm');
	find_plot_label_ok('TEST_FAMILY_01', 0, 1, staggered => 1);
	find_plot_label_ok('TEST_FAMILY_02', 1, 1, staggered => 1);
	find_plot_label_ok('TEST_FAMILY_03', 0, 0, staggered => 1);
	find_plot_label_ok('TEST_FAMILY_04', 1, 0, staggered => 1);

	# Click plot cell to open details modal
	click_plot_cell_ok(0, 1);
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(text(),"Plot Details")]', 'xpath', 'Plot details modal is open for family plot');
	$t->find_element_ok('//div[contains(@class,"show")]//tr[td[contains(normalize-space(),"Family Name:")]]/td[2][contains(normalize-space(),"TEST_FAMILY_01")]', 'xpath', 'Verify Family Name displayed in summary table');
	$t->find_element_ok('//div[contains(@class,"show")]//a[contains(normalize-space(),"Replace Family")]', 'xpath', 'Verify "Replace Family" tab title');

	# Switch to Replace Family tab and verify labels
	$t->click_ok('//div[contains(@class,"show")]//a[contains(normalize-space(),"Replace Family")]', 'xpath', 'Click Replace Family tab');
	$t->find_element_ok('//div[contains(@class,"show")]//label[contains(normalize-space(),"New Family Name:")]', 'xpath', 'Verify "New Family Name:" label');
	$t->find_element_ok('//div[contains(@class,"show")]//button[contains(normalize-space(),"Update Family")]', 'xpath', 'Verify "Update Family" button');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Close plot details modal for family plot');

	# Interactive Hover Tooltip for Family Plot
	hover_plot_cell(0, 1);
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip") and contains(.,"TEST_FAMILY_01")]', 'xpath', 'Tooltip displays family name on hover');
	unhover_plot_cell(0, 1);
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"fieldmap-tooltip")]', 'xpath')}), 'Tooltip dismissed after unhover from family plot');

	# =========================================================================
	# Overlapping Plots Handling & Interactive Hover Tooltip
	# =========================================================================
	my $overlap_trial_id = create_trial_with_overlapping_plots(
		'Test_Overlap_Fieldmap_Trial',
		['TEST_OVERLAP_01', 'TEST_OVERLAP_02', 'TEST_OVERLAP_03', 'TEST_OVERLAP_04', 'TEST_OVERLAP_05']
	);

	$t->wait_for_network_idle();
	$t->get_ok("/breeders/trial/$overlap_trial_id", 'Navigate to created overlapping plots trial page');
	$t->click_ok('pheno_heatmap_onswitch', 'id', 'Open fieldmap section on overlapping plots trial');
	$t->wait_for_working_dialog();
	$t->find_element_ok('//*[@id="' . $svg_id . '"]', 'xpath', 'Find fieldmap SVG on overlapping plots trial');

	# Verify Legend contains Overlapping Plots item and styling swatch
	$t->find_element_ok('//div[@id="legend_list"]//span[contains(normalize-space(),"Overlapping Plots")]', 'xpath', 'Find Overlapping Plots item in legend');
	$t->find_element_ok('//div[@id="legend_list"]//span[contains(normalize-space(),"Overlapping Plots")]//span[contains(@class,"tw:bg-[#000000]") and contains(@class,"tw:border-[#ff0000]")]', 'xpath', 'Find black swatch with red border for Overlapping Plots in legend');

	# Verify Overlapping Cell Styling at grid (0, 1) -> (col 1, row 1)
	find_overlapping_cell_ok(0, 1);

	# Verify Non-Overlapping Cells have standard styling (not black fill or red stroke)
	find_plot_cell_ok(1, 1); # Plot 103
	find_plot_cell_ok(0, 0); # Plot 201
	find_plot_cell_ok(1, 0); # Plot 202
	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="g" and @transform="translate(52, 52)"]/*[local-name()="rect" and @fill="' . $overlap_fill . '"]', 'xpath')}), 'Non-overlapping plot (1,1) does not have overlap fill');

	# Verify Plot Labels: Overlapping cell suppresses individual labels, non-overlapping cells display labels
	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="101"]', 'xpath')}), 'No plot label 101 rendered for overlapping plot cell');
	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="102"]', 'xpath')}), 'No plot label 102 rendered for overlapping plot cell');
	find_plot_label_ok('103', 1, 1);
	find_plot_label_ok('201', 0, 0);
	find_plot_label_ok('202', 1, 0);

	# Interactive Hover Tooltip on Overlapping Plot
	hover_plot_cell(0, 1);
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Overlapping Plots:")]', 'xpath', 'Find Overlapping Plots header in tooltip on hover');
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip") and contains(.,"101") and contains(.,"102")]', 'xpath', 'Find overlapping plot numbers 101 and 102 in tooltip');

	# Unhover dismisses tooltip
	unhover_plot_cell(0, 1);
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"fieldmap-tooltip")]', 'xpath')}), 'Tooltip dismissed after mouse leave from overlapping plot');

	# Interactive Hover Tooltip on Non-Overlapping Plot (Plot 103)
	hover_plot_cell(1, 1);
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Plot Name:")]', 'xpath', 'Find Plot Name header in tooltip on non-overlapping plot');
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Plot Number:")]', 'xpath', 'Find Plot Number header in tooltip on non-overlapping plot');
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip") and contains(.,"103")]', 'xpath', 'Find plot number 103 in tooltip');
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Block Number:")]/parent::div[contains(.,"1")]', 'xpath', 'Find Block Number in tooltip on non-overlapping plot');
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Rep Number:")]/parent::div[contains(.,"1")]', 'xpath', 'Find Rep Number in tooltip on non-overlapping plot');
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Accession Name:")]/parent::div[contains(.,"TEST_OVERLAP_03")]', 'xpath', 'Find Accession Name in tooltip on non-overlapping plot');
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Overlapping Plots:")]', 'xpath')}), 'No Overlapping Plots header in tooltip for non-overlapping plot');

	# Unhover dismisses tooltip
	unhover_plot_cell(1, 1);
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"fieldmap-tooltip")]', 'xpath')}), 'Tooltip dismissed after mouse leave from non-overlapping plot');

	# Click Overlapping Plot opens Details Modal
	click_plot_cell_ok(0, 1);
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(text(),"Plot Details")]', 'xpath', 'Plot details modal opens when clicking overlapping plot');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Close plot details modal');

	# =========================================================================
	# Intercrop Accession Display in Tooltip & Spatial Layout CSV
	# =========================================================================
	my $intercrop_trial_id = create_trial_with_intercrop_plots(
		'Test_Intercrop_Fieldmap_Trial',
		['TEST_PRIMARY_01', 'TEST_PRIMARY_02', 'TEST_PRIMARY_03', 'TEST_PRIMARY_04'],
		['TEST_INTERCROP_01', 'TEST_INTERCROP_02']
	);

	$t->wait_for_network_idle();
	$t->get_ok("/breeders/trial/$intercrop_trial_id", 'Navigate to created intercrop trial page');
	$t->click_ok('pheno_heatmap_onswitch', 'id', 'Open fieldmap section on intercrop trial');
	$t->wait_for_working_dialog();
	$t->find_element_ok('//*[@id="' . $svg_id . '"]', 'xpath', 'Find fieldmap SVG on intercrop trial');

	# Interactive Hover Tooltip on Plot 101 with single intercrop (col 0, row 1)
	hover_plot_cell(0, 1);
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//div[strong[contains(text(),"Accession Name:")] and contains(.,"TEST_PRIMARY_01")]', 'xpath', 'Tooltip displays primary accession for Plot 101');
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//div[strong[contains(text(),"Accession Name:")] and contains(.,"TEST_INTERCROP_01")]', 'xpath', 'Tooltip displays intercrop accession for Plot 101');
	unhover_plot_cell(0, 1);
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"fieldmap-tooltip")]', 'xpath')}), 'Tooltip dismissed after unhover from Plot 101');

	# Interactive Hover Tooltip on Plot 201 with NO intercrop (col 0, row 0)
	hover_plot_cell(0, 0);
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//div[strong[contains(text(),"Accession Name:")] and contains(.,"TEST_PRIMARY_03")]', 'xpath', 'Tooltip displays primary accession for Plot 201');
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"fieldmap-tooltip")]//div[strong[contains(text(),"Accession Name:")] and contains(.,"TEST_INTERCROP")]', 'xpath')}), 'Tooltip on non-intercropped plot has no intercrop accessions');
	unhover_plot_cell(0, 0);
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"fieldmap-tooltip")]', 'xpath')}), 'Tooltip dismissed after unhover from Plot 201');

	# Interactive Hover Tooltip on Plot 202 with multiple intercrops (col 1, row 0)
	hover_plot_cell(1, 0);
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//div[strong[contains(text(),"Accession Name:")] and contains(.,"TEST_PRIMARY_04")]', 'xpath', 'Tooltip displays primary accession for Plot 202');
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//div[strong[contains(text(),"Accession Name:")] and contains(.,"TEST_INTERCROP_01")]', 'xpath', 'Tooltip displays first intercrop accession for Plot 202');
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//div[strong[contains(text(),"Accession Name:")] and contains(.,"TEST_INTERCROP_02")]', 'xpath', 'Tooltip displays second intercrop accession for Plot 202');
	unhover_plot_cell(1, 0);
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"fieldmap-tooltip")]', 'xpath')}), 'Tooltip dismissed after unhover from Plot 202');

	# Spatial Layout CSV Download with Intercropped Accessions
	my $expected_intercrop_csv = "/tmp/Trial_${intercrop_trial_id}_spatial_layout_expected.csv";
	open my $efh, '>', $expected_intercrop_csv or die "Could not open '$expected_intercrop_csv': $!";
	print $efh "Rows/Columns,1,2\n";
	print $efh "2,\"TEST_PRIMARY_03\",\"TEST_PRIMARY_04, TEST_INTERCROP_01, TEST_INTERCROP_02\"\n";
	print $efh "1,\"TEST_PRIMARY_01, TEST_INTERCROP_01\",\"TEST_PRIMARY_02\"\n";
	close $efh;

	download_spatial_layout_ok(
		"Trial_${intercrop_trial_id}_spatial_layout.csv",
		$expected_intercrop_csv,
		['Accession Name']
	);
	unlink $expected_intercrop_csv if -e $expected_intercrop_csv;

	# =========================================================================
	# Direct Plant Grid Hierarchy (Without Subplots)
	# =========================================================================
	my $direct_plant_trial_id = create_trial_with_direct_plants(
		'Test_Direct_Plant_Fieldmap_Trial',
		['TEST_DIRECT_PLANT_01', 'TEST_DIRECT_PLANT_02', 'TEST_DIRECT_PLANT_03', 'TEST_DIRECT_PLANT_04']
	);

	$t->wait_for_network_idle();
	$t->get_ok("/breeders/trial/$direct_plant_trial_id", 'Navigate to created direct plant trial page');
	$t->click_ok('pheno_heatmap_onswitch', 'id', 'Open fieldmap section on direct plant trial');
	$t->wait_for_working_dialog();
	$t->find_element_ok('//*[@id="' . $svg_id . '"]', 'xpath', 'Find fieldmap SVG on direct plant trial');

	# Click Plot 101 (grid col 0, row 1) to open details modal
	click_plot_cell_ok(0, 1);
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(text(),"Plot Details")]', 'xpath', 'Plot details modal is open for Plot 101');
	$t->find_element_ok('//h5[contains(text(),"Plot Contents & Structure Hierarchy:")]', 'xpath', 'Verify Plot Contents & Structure Hierarchy heading');

	# Verify direct plant coordinate grid table rendered
	$t->find_element_ok('//div[contains(@class,"show")]//table[contains(@class,"plant-grid-table")]', 'xpath', 'Find direct plant grid table');
	$t->find_element_ok('//div[contains(@class,"show")]//table[contains(@class,"plant-grid-table")]//th[text()="2"]', 'xpath', 'Find plant grid row/column header 2');

	# Verify all 4 direct plant cells rendered in the table with plant names
	my $direct_plant_cells = $t->driver->find_elements('//div[contains(@class,"show")]//table[contains(@class,"plant-grid-table")]//td[contains(@class,"plant-grid-cell")]', 'xpath');
	is(scalar(@$direct_plant_cells), 4, 'Direct plant grid contains 4 plant cells');
	$t->find_element_ok('//div[contains(@class,"show")]//table[contains(@class,"plant-grid-table")]//td[contains(@class,"plant-grid-cell") and contains(.,"plant_1")]', 'xpath', 'Verify plant_1 in grid');
	$t->find_element_ok('//div[contains(@class,"show")]//table[contains(@class,"plant-grid-table")]//td[contains(@class,"plant-grid-cell") and contains(.,"plant_4")]', 'xpath', 'Verify plant_4 in grid');

	# Verify NO subplot containers or headings exist
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"show")]//div[contains(@class,"tw:font-bold") and contains(text(),"subplot")]', 'xpath')}), 'No subplot headings rendered in direct plant grid');
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"show")]//pre[contains(text(),"subplot")]', 'xpath')}), 'No subplot references in JSON hierarchy block');
	$t->find_element_ok('//div[contains(@class,"show")]//pre[contains(text(),"plant")]', 'xpath', 'JSON hierarchy block contains plant nodes');

	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Close plot details modal for Plot 101');

	# Interactive Hover Tooltip for Plot 101 displays plant list
	hover_plot_cell(0, 1);
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip")]//strong[contains(text(),"Plants:")]', 'xpath', 'Tooltip displays Plants: header for direct plant plot');
	$t->find_element_ok('//div[contains(@class,"fieldmap-tooltip") and contains(.,"plant_1") and contains(.,"plant_4")]', 'xpath', 'Tooltip displays plant names');
	unhover_plot_cell(0, 1);
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"fieldmap-tooltip")]', 'xpath')}), 'Tooltip dismissed after unhover from Plot 101');

	# Click Plot 102 (grid col 1, row 1) which has an empty slot at (row 2, col 1)
	click_plot_cell_ok(1, 1);
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(text(),"Plot Details")]', 'xpath', 'Plot details modal is open for Plot 102');
	$t->find_element_ok('//div[contains(@class,"show")]//table[contains(@class,"plant-grid-table")]', 'xpath', 'Find plant grid table for Plot 102');
	$t->find_element_ok('//div[contains(@class,"show")]//table[contains(@class,"plant-grid-table")]//td[contains(@class,"plant-grid-cell")]//span[contains(@class,"tw:text-gray-300") and text()="empty"]', 'xpath', 'Find empty slot placeholder in plant grid');
	$t->find_element_ok('//div[contains(@class,"show")]//table[contains(@class,"plant-grid-table")]//td[contains(@class,"plant-grid-cell") and contains(.,"plant_1")]', 'xpath', 'Find plant_1 in Plot 102 grid');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Close plot details modal for Plot 102');

	# Verify Download Plot Order panel renders "Include Plants" but NOT "Include Subplots"
	$t->find_element_ok('//div[contains(@class,"panel")]//label[contains(.,"Include Plants")]/input', 'xpath', 'Find Include Plants checkbox in Download Plot Order panel');
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"panel")]//label[contains(.,"Include Subplots")]', 'xpath')}), 'No Include Subplots checkbox when trial has no subplots');

	# =========================================================================
	# Geo Field Map Leaflet View
	# =========================================================================
	# Part 1: Trial Without Geo Reference Data (Trial 165)
	$t->wait_for_network_idle();
	$t->get_ok('/breeders/trial/165', 'Navigate to trial 165 for geo field map test');
	$t->click_ok('pheno_heatmap_onswitch', 'id', 'Open fieldmap section on trial 165');
	$t->wait_for_working_dialog();
	$t->find_element_ok('//*[@id="' . $svg_id . '"]', 'xpath', 'Find fieldmap SVG on trial 165');

	# Switch to View Geo Field Layout
	$t->click_option_ok('//label[contains(text(),"Select Layout View:")]/following-sibling::select//option[@value="geofieldmap"]', 'xpath', 'Select View Geo Field Layout on trial without geo coordinates');

	# Verify alert appears warning of no geo reference data
	$t->wait_for_alert_appear();
	my $no_geo_alert = $t->get_alert_text();
	is($no_geo_alert, 'No geo reference data in this trial!', 'Verify alert text when trial has no geo coordinates');
	$t->accept_alert_ok('Accept no geo reference data alert');

	# Verify Leaflet container is rendered and initialized
	$t->find_element_ok('//div[@id="geoflatmap_leaflet" and contains(@class,"leaflet-container")]', 'xpath', 'Find Leaflet map container with leaflet-container class');
	$t->find_element_ok('//div[@id="geoflatmap_leaflet"]//a[contains(@class,"leaflet-control-zoom-in")]', 'xpath', 'Find Leaflet zoom in control');
	$t->find_element_ok('//div[@id="geoflatmap_leaflet"]//a[contains(@class,"leaflet-control-zoom-out")]', 'xpath', 'Find Leaflet zoom out control');
	$t->find_element_ok('//button[contains(text(),"Submit Geo Layout Changes")]', 'xpath', 'Find Submit Geo Layout Changes button');

	# Verify standard fieldmap panels are unmounted
	ok(!scalar(@{$t->driver->find_elements('//*[@id="' . $svg_id . '"]', 'xpath')}), 'Standard SVG chart is unmounted in Geo Field Layout view');
	ok(!scalar(@{$t->driver->find_elements('//*[@id="fieldmap_north_arrow"]', 'xpath')}), 'North arrow is unmounted in Geo Field Layout view');
	ok(!scalar(@{$t->driver->find_elements('//button[@title="Zoom In"]', 'xpath')}), 'Standard zoom controls are unmounted in Geo Field Layout view');
	ok(!scalar(@{$t->driver->find_elements('//button[contains(text(),"Download Heatmap Image")]', 'xpath')}), 'Download Heatmap Image button is not present in Geo Field Layout view');

	# Verify window.geoFieldMapInstance is initialized in browser
	my $has_geo_instance = $t->driver->execute_script('return typeof window.geoFieldMapInstance === "object" && window.geoFieldMapInstance !== null;');
	ok($has_geo_instance, 'window.geoFieldMapInstance is initialized in Geo Field Layout view');

	# Switch back to View Field Layout
	$t->click_option_ok('//label[contains(text(),"Select Layout View:")]/following-sibling::select//option[@value="fieldmap"]', 'xpath', 'Switch back to View Field Layout');
	$t->find_element_ok('//*[@id="' . $svg_id . '"]', 'xpath', 'Standard SVG chart is restored');
	$t->find_element_ok('//*[@id="fieldmap_north_arrow"]', 'xpath', 'North arrow is restored');
	ok(!scalar(@{$t->driver->find_elements('geoflatmap_leaflet', 'id')}), 'Leaflet container is unmounted');
	my $geo_instance_deleted = $t->driver->execute_script('return typeof window.geoFieldMapInstance === "undefined";');
	ok($geo_instance_deleted, 'window.geoFieldMapInstance is cleaned up after switching away from Geo Field Layout');

	# Part 2: Trial With Geo Reference Data
	my $geo_trial_id = create_trial_with_geo_coordinates(
		'Test_Geo_Fieldmap_Trial',
		['TEST_GEO_01', 'TEST_GEO_02', 'TEST_GEO_03', 'TEST_GEO_04']
	);

	$t->wait_for_network_idle();
	$t->get_ok("/breeders/trial/$geo_trial_id", 'Navigate to created geo trial page');
	$t->click_ok('pheno_heatmap_onswitch', 'id', 'Open fieldmap section on geo trial');
	$t->wait_for_working_dialog();
	$t->find_element_ok('//*[@id="' . $svg_id . '"]', 'xpath', 'Find fieldmap SVG on geo trial');

	# Switch to View Geo Field Layout
	$t->click_option_ok('//label[contains(text(),"Select Layout View:")]/following-sibling::select//option[@value="geofieldmap"]', 'xpath', 'Select View Geo Field Layout on trial with geo coordinates');

	# Verify Leaflet container initialized and plot polygon paths rendered
	$t->find_element_ok('//div[@id="geoflatmap_leaflet" and contains(@class,"leaflet-container")]', 'xpath', 'Find Leaflet container on geo trial');
	ok((wait_until {
		scalar(@{$t->driver->find_elements('//div[@id="geoflatmap_leaflet"]//*[local-name()="svg"]//*[local-name()="path"]', 'xpath')}) > 0;
	} timeout => 15, interval => 0.5), 'Leaflet rendered plot polygon paths on trial with geo coordinates');

	my $geo_paths = $t->driver->find_elements('//div[@id="geoflatmap_leaflet"]//*[local-name()="svg"]//*[local-name()="path"]', 'xpath');
	is(scalar(@$geo_paths), 4, 'Leaflet rendered 4 plot polygon paths for the 4 plots');

	# Verify Submit Geo Layout Changes button and test submission
	$t->find_element_ok('//button[contains(text(),"Submit Geo Layout Changes")]', 'xpath', 'Find Submit Geo Layout Changes button on geo trial');
	$t->click_ok('//button[contains(text(),"Submit Geo Layout Changes")]', 'xpath', 'Click Submit Geo Layout Changes button');
	$t->wait_for_alert_appear();
	my $submit_geo_alert = $t->get_alert_text();
	like($submit_geo_alert, qr/(?:successfully|updated)/i, 'Verify alert text after submitting geo layout changes');
	$t->accept_alert_ok('Accept geo layout submission alert');
	$t->wait_for_working_dialog();

	# Switch back to View Field Layout
	$t->click_option_ok('//label[contains(text(),"Select Layout View:")]/following-sibling::select//option[@value="fieldmap"]', 'xpath', 'Switch back to View Field Layout on geo trial');
	$t->find_element_ok('//*[@id="' . $svg_id . '"]', 'xpath', 'Standard SVG chart restored on geo trial');
	ok(!scalar(@{$t->driver->find_elements('geoflatmap_leaflet', 'id')}), 'Leaflet container removed on geo trial');
});

$t->driver->quit();
$f->clean_up_db();
done_testing();
