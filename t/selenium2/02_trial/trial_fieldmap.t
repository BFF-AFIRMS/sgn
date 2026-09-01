use lib 't/lib';
use strict;

use Test::More;

use SGN::Test::WWW::WebDriver;
use SGN::Test::Fixture;
my $t = SGN::Test::WWW::WebDriver->new();
my $f = SGN::Test::Fixture->new();

use Selenium::Waiter qw(wait_until);

use Selenium::Firefox::Profile;

# Set up a Firefox profile to download CSV files without prompting
my $profile = Selenium::Firefox::Profile->new;
$profile->set_preference( 'browser.download.folderList', 2 );
$profile->set_preference( 'browser.download.dir', '/downloads' );
$profile->set_preference( 'browser.helperApps.neverAsk.saveToDisk', 'application/csv;text/csv' );

my $driver = Selenium::Remote::Driver->new(
    firefox_profile => $profile,
    base_url => $ENV{SGN_TEST_SERVER},
    remote_server_addr => $ENV{SGN_REMOTE_SERVER_ADDR} || 'localhost'
);
$t->driver($driver);

my $svg_id = 'fieldmap_chart_svg';
my $CELL_SIZE = 52;
my $CELL_HALF = 25;
my $LABEL_Y_OFFSET = 30;
my $LABEL_Y_OFFSET_STAGGERED_TOP    = 20;
my $LABEL_Y_OFFSET_STAGGERED_BOTTOM = 40;

# Secondary axis layout offsets
my $SEC_X_LABEL_TOP_OFFSET_Y    = -42;
my $SEC_X_LABEL_BOTTOM_OFFSET_Y = 52;
my $SEC_Y_LABEL_LEFT_OFFSET_X   = -60;
my $SEC_Y_LABEL_RIGHT_OFFSET_X  = 60;
my $SEC_X_VAL_TOP_OFFSET_Y      = -26;
my $SEC_X_VAL_BOTTOM_OFFSET_Y   = 36;
my $SEC_Y_VAL_LEFT_OFFSET_X     = -40;
my $SEC_Y_VAL_RIGHT_OFFSET_X    = 40;

my $border_fill = '#ecefef';
my $even_block_fill = '#c7e9b4';
my $odd_block_fill = '#41b6c4';
my @palette = (
	'#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3',
	'#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd',
	'#ccebc5', '#ffed6f'
);

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

sub find_svg_square_ok {
	my ($x, $y, $fill) = @_;
	my $xpath = defined $fill ? 
		'//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="g" and @transform="translate(' . $x . ', ' . $y . ')"]/*[local-name()="rect" and @fill="' . $fill . '"]' : 
		'//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="g" and @transform="translate(' . $x . ', ' . $y . ')"]';
	return $t->find_element_ok($xpath, 'xpath', "Find plot square at ($x,$y)" . (defined $fill ? " with fill '$fill'" : ""));
}

sub click_svg_square_ok {
	my ($x, $y) = @_;
	my $xpath = '//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="g" and @transform="translate(' . $x . ', ' . $y . ')"]/*[local-name()="rect"]';
	return $t->click_ok($xpath, 'xpath', "Click plot square at ($x,$y)");
}

sub cell_pos {
	my ($col, $row) = @_;
	return ($col * $CELL_SIZE, $row * $CELL_SIZE);
}

sub find_plot_cell_ok {
	my ($col, $row, $fill) = @_;
	my ($x, $y) = cell_pos($col, $row);
	return find_svg_square_ok($x, $y, $fill);
}

sub click_plot_cell_ok {
	my ($col, $row) = @_;
	my ($x, $y) = cell_pos($col, $row);
	return click_svg_square_ok($x, $y);
}

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

sub find_sec_x_label_ok {
	my ($text, $num_cols, $num_rows, $side) = @_;
	my $grid_w = $num_cols * $CELL_SIZE;
	my $grid_h = $num_rows * $CELL_SIZE;
	my $x = $grid_w / 2;
	my $y = ($side eq 'top') ? $SEC_X_LABEL_TOP_OFFSET_Y : ($grid_h + $SEC_X_LABEL_BOTTOM_OFFSET_Y);
	return find_svg_text_ok($text, $x, $y);
}

sub find_sec_y_label_ok {
	my ($text, $num_cols, $num_rows, $side) = @_;
	my $grid_w = $num_cols * $CELL_SIZE;
	my $grid_h = $num_rows * $CELL_SIZE;
	my $x = ($side eq 'left') ? $SEC_Y_LABEL_LEFT_OFFSET_X : ($grid_w + $SEC_Y_LABEL_RIGHT_OFFSET_X);
	my $y = $grid_h / 2;
	return find_svg_text_ok($text, $x, $y);
}

sub find_sec_x_val_ok {
	my ($text, $col, $num_rows, $side) = @_;
	my $x = $col * $CELL_SIZE + $CELL_HALF;
	my $grid_h = defined $num_rows ? $num_rows * $CELL_SIZE : 0;
	my $y = ($side eq 'top') ? $SEC_X_VAL_TOP_OFFSET_Y : ($grid_h + $SEC_X_VAL_BOTTOM_OFFSET_Y);
	return find_svg_text_ok($text, $x, $y);
}

sub find_sec_y_val_ok {
	my ($text, $row, $num_cols, $side) = @_;
	my $grid_w = defined $num_cols ? $num_cols * $CELL_SIZE : 0;
	my $x = ($side eq 'left') ? $SEC_Y_VAL_LEFT_OFFSET_X : ($grid_w + $SEC_Y_VAL_RIGHT_OFFSET_X);
	my $y = $row * $CELL_SIZE + $LABEL_Y_OFFSET;
	return find_svg_text_ok($text, $x, $y);
}

sub set_dimensions {
	my ($columns, $rows) = @_;
	$t->click_ok('//button[@title="Change Dimensions"]', 'xpath', 'Click Change Dimensions button');
	if (defined $columns) {
		$t->send_keys_ok('//label[contains(text(),"Columns")]/following-sibling::input', 'xpath', $columns, "Set Columns input to $columns", clear => 1);
	}
	if (defined $rows) {
		$t->send_keys_ok('//label[contains(text(),"Rows")]/following-sibling::input', 'xpath', $rows, "Set Rows input to $rows", clear => 1);
	}
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Apply")]', 'xpath', 'Click Apply button');
}

sub set_secondary_axis {
	my ($x_label, $y_label, $x_values, $y_values) = @_;
	$t->click_ok('//button[@title="Change Secondary Axis"]', 'xpath', 'Click Change Secondary Axis button');
	$t->send_keys_ok('//label[contains(text(),"Secondary X Axis Label")]/following-sibling::input', 'xpath', $x_label, "Enter new secondary x axis label", clear => 1);
	$t->send_keys_ok('//label[contains(text(),"Secondary Y Axis Label")]/following-sibling::input', 'xpath', $y_label, "Enter new secondary y axis label", clear => 1);
	$t->send_keys_ok('//label[contains(text(),"Secondary X Axis Values")]/following-sibling::input', 'xpath', $x_values, "Enter new secondary x axis values", clear => 1);
	$t->send_keys_ok('//label[contains(text(),"Secondary Y Axis Values")]/following-sibling::input', 'xpath', $y_values, "Enter new secondary y axis values", clear => 1);
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Apply")]', 'xpath', 'Click Apply button');
}

sub set_layout_view {
	my ($view_option_text) = @_;
	$t->click_ok('//label[contains(text(),"Select Layout View:")]/following-sibling::select//option[contains(text(),"' . $view_option_text . '")]', 'xpath', "Select Layout View '$view_option_text'");
	$t->wait_for_working_dialog();
}

sub set_color_by {
	my ($color_by) = @_;
	$t->click_ok('//label[contains(text(),"Color By:")]/following-sibling::select/option[@value="' . $color_by . '"]', 'xpath', "Select Color By '$color_by'");
}

sub set_label_by {
	my ($label_by) = @_;
	$t->click_ok('//label[contains(text(),"Label By:")]/following-sibling::select/option[@value="' . $label_by . '"]', 'xpath', "Select Label By '$label_by'");
}

sub set_label_size {
	my ($size) = @_;
	$t->send_keys_ok('//label[contains(text(),"Label Size:")]/following-sibling::input', 'xpath', $size, "Set Label Size to $size", clear => 1);
}

sub find_north_arrow_ok {
	my ($rotation) = @_;
	my $xpath = '//*[@id="fieldmap_north_arrow"]//*[local-name()="svg" and contains(@style, "rotate(' . $rotation . 'deg)")]';
	return $t->find_element_ok($xpath, 'xpath', "Find north arrow with rotation $rotation degrees");
}

sub set_north_arrow_angle {
	my ($angle) = @_;
	$t->send_keys_ok('//label[contains(text(),"North Angle")]/following-sibling::input', 'xpath', $angle, "Set North Angle to $angle degrees", clear => 1);
}

sub get_svg_transform {
	# SVG attributes are not read correctly by Selenium, so we need to use JavaScript to get the transform values
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

sub download_spatial_layout_ok {
	my ($filename, $expected_filepath, $checkboxes) = @_;
	$checkboxes ||= $all_checkbox_labels;

	my $file_path = '/selenium/downloads/' . $filename;
	if (-e $file_path) {
		unlink $file_path or die "Could not delete existing file '$file_path': $!";
	}

	$t->click_ok('//button[@title="Download Spatial Layout (CSV)"]', 'xpath', 'Click Download Spatial Layout button');

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

$t->while_logged_in_as("curator", sub {
	$t->get_ok('/breeders/trial/165', 'Navigate to trial page');

	$t->click_ok('pheno_heatmap_onswitch', 'id', 'Open fieldmap section');
	$t->wait_for_working_dialog();
	$t->find_element_ok('//*[@id="' . $svg_id . '"]', 'xpath', 'Find fieldmap SVG');

	# Test Zoom & Pan Controls
	my $tf = get_svg_transform();
	is($tf->{zoom}, 1, 'Initial zoom is 1');
	is($tf->{x}, 0, 'Initial pan X is 0');
	is($tf->{y}, 0, 'Initial pan Y is 0');

	$t->click_ok('//button[@title="Zoom In"]', 'xpath', 'Click Zoom In button');
	$tf = get_svg_transform();
	cmp_ok(abs($tf->{zoom} - 1.2), '<', 0.05, 'Zoom level is ~1.2 after Zoom In');

	$t->click_ok('//button[@title="Zoom In"]', 'xpath', 'Click Zoom In button again');
	$tf = get_svg_transform();
	cmp_ok(abs($tf->{zoom} - 1.44), '<', 0.05, 'Zoom level is ~1.44 after second Zoom In');

	$t->click_ok('//button[@title="Zoom Out"]', 'xpath', 'Click Zoom Out button');
	$tf = get_svg_transform();
	cmp_ok(abs($tf->{zoom} - 1.2), '<', 0.05, 'Zoom level is ~1.2 after Zoom Out');

	$t->click_ok('//button[@title="Reset View"]', 'xpath', 'Click Reset View button');
	$tf = get_svg_transform();
	is($tf->{zoom}, 1, 'Zoom reset to 1');
	is($tf->{x}, 0, 'Pan X reset to 0');
	is($tf->{y}, 0, 'Pan Y reset to 0');

	# Mouse wheel zoom in (negative deltaY)
	mouse_wheel_zoom(-100);
	$tf = get_svg_transform();
	cmp_ok(abs($tf->{zoom} - 1.1), '<', 0.05, 'Zoom level is ~1.1 after wheel zoom in');

	# Mouse wheel zoom out (positive deltaY)
	mouse_wheel_zoom(100);
	$tf = get_svg_transform();
	cmp_ok(abs($tf->{zoom} - 1.0), '<', 0.05, 'Zoom level is ~1.0 after wheel zoom out');

	$t->click_ok('//button[@title="Reset View"]', 'xpath', 'Click Reset View button after wheel zoom');
	$tf = get_svg_transform();
	is($tf->{zoom}, 1, 'Zoom reset to 1 after wheel zoom');
	is($tf->{x}, 0, 'Pan X reset to 0 after wheel zoom');
	is($tf->{y}, 0, 'Pan Y reset to 0 after wheel zoom');

	# Click and drag panning
	drag_svg(60, 40);
	$tf = get_svg_transform();
	cmp_ok(abs($tf->{x} - 60), '<', 2, 'Pan X moved by ~60px after drag');
	cmp_ok(abs($tf->{y} - 40), '<', 2, 'Pan Y moved by ~40px after drag');

	$t->click_ok('//button[@title="Reset View"]', 'xpath', 'Click Reset View button after drag');
	$tf = get_svg_transform();
	is($tf->{zoom}, 1, 'Zoom reset to 1 after drag');
	is($tf->{x}, 0, 'Pan X reset to 0 after drag');
	is($tf->{y}, 0, 'Pan Y reset to 0 after drag');

	find_plot_cell_ok(0, 2);
	find_plot_cell_ok(6, 0);

	find_plot_cell_ok(0, 2, $odd_block_fill);
	find_plot_cell_ok(0, 1, $even_block_fill);
	find_plot_cell_ok(0, 0, $odd_block_fill);

	set_color_by('block');
	find_plot_cell_ok(0, 2, $palette[0]);
	find_plot_cell_ok(1, 2, $palette[0]);
	find_plot_cell_ok(0, 1, $palette[1]);
	find_plot_cell_ok(0, 0, $palette[2]);

	set_color_by('germplasm');
	find_plot_cell_ok(0, 2, $palette[4]);
	find_plot_cell_ok(1, 2, $palette[3]);
	find_plot_cell_ok(2, 2, $palette[2]);
	find_plot_cell_ok(3, 2, $palette[1]);
	find_plot_cell_ok(0, 1, $palette[0]);

	set_color_by('family_name');
	find_plot_cell_ok(0, 2, $even_block_fill);

	set_color_by('cross_name');
	find_plot_cell_ok(0, 2, $even_block_fill);

	set_color_by('parity');
	find_plot_cell_ok(0, 2, $odd_block_fill);
	find_plot_cell_ok(0, 1, $even_block_fill);

	set_label_by('germplasm');
	set_label_size(14);
	find_plot_label_ok('IITA-TMS-IBA980581', 0, 2, font_size => 14, staggered => 1);
	find_plot_label_ok('IITA-TMS-IBA980002', 1, 2, font_size => 14, staggered => 1);
	find_plot_label_ok('IITA-TMS-IBA30572', 2, 2, font_size => 14, staggered => 1);
	find_plot_label_ok('BLANK', 0, 1, font_size => 14, staggered => 1);

	set_label_by('block');
	find_plot_label_ok('1', 0, 2, font_size => 14);
	find_plot_label_ok('2', 0, 1, font_size => 14);
	find_plot_label_ok('3', 0, 0, font_size => 14);

	set_label_by('family_name');
	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="IITA-TMS-IBA980581"]', 'xpath')}), 'No accession labels found when labeled by family');
	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="101"]', 'xpath')}), 'No plot number labels found when labeled by family');

	set_label_by('cross_name');
	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="IITA-TMS-IBA980581"]', 'xpath')}), 'No accession labels found when labeled by cross');
	ok(!scalar(@{$t->driver->find_elements('//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="101"]', 'xpath')}), 'No plot number labels found when labeled by cross');

	set_label_size(10);
	set_label_by('plot_number');
	find_plot_label_ok('103', 0, 2);
	find_plot_label_ok('201', 0, 1);
	find_plot_label_ok('301', 0, 0);

	# Test Assayed Trait Views & Heatmap rendering
	set_layout_view('cass sink leaf|3-phosphoglyceric acid|ug/g|week 16|COMP:0000013');
	$t->find_element_ok('//div[@id="legend_list"]//span[contains(.,"Low trait value (cass sink leaf|3-phosphoglyceric acid|ug/g|week 16|COMP:0000013)")]', 'xpath', 'Find low trait value text in legend');
	$t->find_element_ok('//div[@id="legend_list"]//span[contains(text(),"High trait value")]', 'xpath', 'Find high trait value text in legend');
	$t->find_element_ok('//div[@id="legend_list"]//div[contains(@style,"linear-gradient")]', 'xpath', 'Find color gradient bar in legend');
	$t->find_element_ok('//button[contains(text(),"Download Heatmap Image")]', 'xpath', 'Find Download Heatmap Image button');
	$t->find_element_ok('//button[contains(text(),"Delete Selected Trait")]', 'xpath', 'Find Delete Selected Trait button');

	find_plot_cell_ok(0, 2, '#910d0d');
	find_plot_cell_ok(2, 2, '#8b0000');
	find_plot_cell_ok(0, 1, '#a9afaf');
	find_plot_cell_ok(5, 0, '#ffffff');

	# Test Suppress Phenotype workflow
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

	set_layout_view('View Field Layout');
	ok(!scalar(@{$t->driver->find_elements('//div[@id="legend_list"]//span[contains(.,"Low trait value")]', 'xpath')}), 'Low trait value legend not present in Field Map view');
	ok(!scalar(@{$t->driver->find_elements('//div[@id="legend_list"]//div[contains(@style,"linear-gradient")]', 'xpath')}), 'Gradient bar not present in Field Map view');
	ok(!scalar(@{$t->driver->find_elements('//button[contains(text(),"Delete Selected Trait")]', 'xpath')}), 'Delete Selected Trait button not present in Field Map view');
	find_plot_cell_ok(0, 2, $odd_block_fill);
	find_plot_cell_ok(0, 1, $even_block_fill);

	find_north_arrow_ok(0);

	set_north_arrow_angle(45);
	find_north_arrow_ok(45);

	set_north_arrow_angle(135);
	find_north_arrow_ok(135);

	set_north_arrow_angle(0);
	find_north_arrow_ok(0);

	set_secondary_axis('Test X Label', 'Test Y Label', 'tx1,tx2,tx3,tx4', 'ty1,ty2,ty3,ty4');

	find_sec_x_label_ok('Test X Label', 7, 3, 'top');
	find_sec_x_label_ok('Test X Label', 7, 3, 'bottom');
	find_sec_y_label_ok('Test Y Label', 7, 3, 'left');
	find_sec_y_label_ok('Test Y Label', 7, 3, 'right');

	find_sec_x_val_ok('tx1', 0, 3, 'top');
	find_sec_x_val_ok('tx1', 0, 3, 'bottom');
	find_sec_y_val_ok('ty3', 0, 7, 'left');
	find_sec_y_val_ok('ty3', 0, 7, 'right');

	$t->click_ok('//button[@title="Rotate"]', 'xpath', 'Click Rotate button');
	find_plot_label_ok('103', 0, 0);
	find_plot_label_ok('207', 1, 6);
	find_sec_y_val_ok('tx3', 2, 3, 'right');
	find_north_arrow_ok(90);

	$t->click_ok('//button[@title="Transpose Display"]', 'xpath', 'Click Transpose Display button');
	find_plot_label_ok('103', 6, 2);
	find_plot_label_ok('307', 0, 0);

	$t->click_ok('//label[contains(text(),"Invert Rows")]/input', 'xpath', 'Click Invert Rows checkbox');
	find_plot_label_ok('104', 5, 0);
	find_plot_label_ok('205', 2, 1);
	find_sec_y_val_ok('ty3', 2, 7, 'right');
	find_sec_x_val_ok('tx4', 3, 3, 'bottom');
	find_north_arrow_ok(180);

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

	set_dimensions(4, undef);
	find_plot_label_ok('301', 4, 3);
	find_plot_label_ok('307', 3, 4);
	find_north_arrow_ok(90);

	download_spatial_layout_ok(
		'Trial_165_spatial_layout.csv',
		't/data/fieldmap/Trial_165_spatial_layout_t1.csv',
		['Accession Name', 'Plot Number', 'Family']
	);

	download_spatial_layout_ok(
		'Trial_165_spatial_layout.csv',
		't/data/fieldmap/Trial_165_spatial_layout_t2.csv',
	);

	click_plot_cell_ok(3, 2);
	$t->find_element_ok('//div[contains(@class,"show")]//tr[td[contains(text(),"Accession")]]/td[2][contains(text(),"IITA-TMS-IBA30572")]', 'xpath', 'Verify accession name IITA-TMS-IBA30572 is displayed in the details modal');
	$t->find_element_ok('//tr[td[contains(text(),"Plot Number")]]/td[2][contains(text(),"206")]', 'xpath', 'Verify plot number 206 is displayed in the details modal');
	$t->find_element_ok('//tr[td[contains(text(),"Coordinates")]]/td[2][contains(normalize-space(),"3 / 3")]', 'xpath', 'Verify coordinates are 3 / 3');
	$t->find_element_ok('//h5[contains(text(),"Plot Contents & Structure Hierarchy:")]/following-sibling::div/pre[contains(text(),"CASS_6Genotypes_206")]', 'xpath', 'Verify plot contents and structure hierarchy is displayed in the details modal');

	$t->click_ok('//div[contains(@class,"show")]//a[contains(text(),"Replace")]', 'xpath', 'Click Replace Accession tab');
	$t->send_keys_ok('//div[contains(@class,"show")]//label[contains(normalize-space(),"Accession")]/following-sibling::div//input', 'xpath', 'XG120015', 'Set New Accession Name input to XG120015');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Update")]', 'xpath', 'Click Update Accession button');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Override")]', 'xpath', 'Click override button in modal');
	$t->accept_alert_ok('Accept alert after updating accession');

	$t->wait_for_network_idle();
	click_plot_cell_ok(3, 2);
	$t->find_element_ok('//div[contains(@class,"show")]//tr[td[contains(text(),"Accession")]]/td[2][contains(text(),"XG120015")]', 'xpath', 'Verify accession name XG120015 is displayed in the details modal');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Click Close button in details modal');

	$t->click_ok('//label[contains(text(),"Invert Columns")]/input', 'xpath', 'Click Invert Columns checkbox');
	find_plot_label_ok('207', 1, 2);
	find_north_arrow_ok(270);

	$t->click_ok('//button[@title="Rotate"]', 'xpath', 'Click Rotate button');
	find_plot_label_ok('207', 5, 0);
	find_north_arrow_ok(0);

	# Test "Display Trials in Same Field" on trial 139
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

	# Disable "Display Trials in Same Field"
	$t->click_ok('//label[contains(text(),"Display Trials in Same Field")]/input', 'xpath', 'Uncheck Display Trials in Same Field checkbox');
	$t->wait_for_working_dialog();

	# Verify reset state
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


});

$t->driver->quit();
$f->clean_up_db();
done_testing();
