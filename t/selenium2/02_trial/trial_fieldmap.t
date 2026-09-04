use lib 't/lib';
use strict;
use warnings;

use Test::More;

use File::Copy;
use SGN::Test::WWW::WebDriver;
use SGN::Test::Fixture;
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
$profile->set_preference( 'browser.helperApps.neverAsk.saveToDisk', 'application/csv;text/csv' );

my $driver = Selenium::Remote::Driver->new(
    firefox_profile    => $profile,
    base_url           => $ENV{SGN_TEST_SERVER},
    remote_server_addr => $ENV{SGN_REMOTE_SERVER_ADDR} || 'localhost'
);
$t->driver($driver);

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
my @palette = (
	'#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3',
	'#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd',
	'#ccebc5', '#ffed6f'
);

# -----------------------------------------------------------------------------
# SVG & Field Map Helper Functions
# -----------------------------------------------------------------------------

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

# Select a view from the "Select Layout View" dropdown (e.g. Field Layout or Assayed Trait)
sub set_layout_view {
	my ($view_option_text) = @_;
	$t->click_ok('//label[contains(text(),"Select Layout View:")]/following-sibling::select//option[contains(text(),"' . $view_option_text . '")]', 'xpath', "Select Layout View '$view_option_text'");
	$t->wait_for_working_dialog();
}

# Select a coloring option from the "Color By:" dropdown
sub set_color_by {
	my ($color_by) = @_;
	$t->click_ok('//label[contains(text(),"Color By:")]/following-sibling::select/option[@value="' . $color_by . '"]', 'xpath', "Select Color By '$color_by'");
}

# Select a labeling option from the "Label By:" dropdown
sub set_label_by {
	my ($label_by) = @_;
	$t->click_ok('//label[contains(text(),"Label By:")]/following-sibling::select/option[@value="' . $label_by . '"]', 'xpath', "Select Label By '$label_by'");
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

	my $file_path = '/selenium/downloads/' . $filename;
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
	# Plot Cell Coloring ("Color By" Options)
	# =========================================================================
	find_plot_cell_ok(0, 2);
	find_plot_cell_ok(6, 0);

	# Default parity coloring (even block vs odd block fills)
	find_plot_cell_ok(0, 2, $odd_block_fill);
	find_plot_cell_ok(0, 1, $even_block_fill);
	find_plot_cell_ok(0, 0, $odd_block_fill);

	# Color by Block
	set_color_by('block');
	find_plot_cell_ok(0, 2, $palette[0]);
	find_plot_cell_ok(1, 2, $palette[0]);
	find_plot_cell_ok(0, 1, $palette[1]);
	find_plot_cell_ok(0, 0, $palette[2]);

	# Color by Germplasm (Accession)
	set_color_by('germplasm');
	find_plot_cell_ok(0, 2, $palette[4]);
	find_plot_cell_ok(1, 2, $palette[3]);
	find_plot_cell_ok(2, 2, $palette[2]);
	find_plot_cell_ok(3, 2, $palette[1]);
	find_plot_cell_ok(0, 1, $palette[0]);

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
	find_plot_cell_ok(0, 2, $odd_block_fill);
	find_plot_cell_ok(0, 1, $even_block_fill);

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
	# Verify opening and closing modal via external header button (#trial_fieldmap_download_layout_button)
	$t->click_ok('trial_fieldmap_download_layout_button', 'id', 'Click external Download Spatial Layout button in section header');
	$t->find_element_ok('//div[contains(@class,"show")]//h4[contains(@class,"modal-title") and contains(text(),"Download Spatial Layout Customizer")]', 'xpath', 'Download Spatial Layout Customizer modal is open via external header button');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Click Close button in Download CSV modal opened via external button');
	ok(!scalar(@{$t->driver->find_elements('//div[contains(@class,"show")]//h4[contains(text(),"Download Spatial Layout Customizer")]', 'xpath')}), 'Download CSV modal is closed after clicking Close');

	# Test CSV download with specific subset of metadata columns (opened via toolbar button)
	download_spatial_layout_ok(
		'Trial_165_spatial_layout.csv',
		't/data/fieldmap/Trial_165_spatial_layout_t1.csv',
		['Accession Name', 'Plot Number', 'Family']
	);

	# Test CSV download with all metadata columns enabled (opened via external header button)
	download_spatial_layout_ok(
		'Trial_165_spatial_layout.csv',
		't/data/fieldmap/Trial_165_spatial_layout_t2.csv',
		undef,
		'//*[@id="trial_fieldmap_download_layout_button"]'
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

	# =========================================================================
	# "Display Trials in Same Field" Multi-Trial Visualization
	# =========================================================================
	# Mark test_location as a "Field" to link co-located trials
	$f->dbh->do(<<'EOSQL');
INSERT INTO public.nd_geolocationprop (nd_geolocation_id, type_id, value, rank)
VALUES (23, 77158, 'Field', 0)
EOSQL

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
	$t->click_ok('//label[contains(text(),"Plot Layout:")]/following-sibling::select/option[@value="serpentine"]', 'xpath', 'Select Serpentine plot layout');

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

	$t->get_ok('/breeders/trial/165', 'Reload trial 165 page to view updated fieldmap with image');
	$t->click_ok('pheno_heatmap_onswitch', 'id', 'Open fieldmap section');
	$t->wait_for_working_dialog();
	$t->find_element_ok('//*[@id="' . $svg_id . '"]', 'xpath', 'Find fieldmap SVG on reloaded page');

	# Verify orange camera icon badge rendered on plot tile CASS_6Genotypes_103
	$t->find_element_ok('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="rect" and @fill="#ff8c00"]', 'xpath', 'Find orange camera icon on plot tile');
	$t->find_element_ok('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="g" and @transform="translate(5, 5) scale(0.6)"]/*[local-name()="circle" and @fill="#ffffff"]', 'xpath', 'Find white lens circle of camera icon');

	# Click the plot tile with the camera icon and verify image display in Plot Details modal
	$t->click_ok('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="g"][./*[local-name()="rect" and @fill="#ff8c00"]]/*[local-name()="rect" and @width="50"]', 'xpath', 'Click plot square that has camera icon');
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
});

$t->driver->quit();
$f->clean_up_db();
done_testing();
