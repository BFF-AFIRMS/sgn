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
my $border_fill = '#ecefef';

sub find_svg_text_ok {
	my ($text, $x, $y) = @_;

	my $xpath = (defined $x && defined $y) ?
		'//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="' . $text . '" and @x="' . $x . '" and @y="' . $y . '"]' :
		'//*[local-name()="svg" and @id="' . $svg_id . '"]//*[local-name()="text" and text()="' . $text . '"]';

	return $t->find_element_ok($xpath, 'xpath', "Find text element '$text' at ($x,$y)");
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

sub find_north_arrow_ok {
	my ($rotation) = @_;
	my $xpath = '//*[@id="fieldmap_north_arrow"]//*[local-name()="svg" and contains(@style, "rotate(' . $rotation . 'deg)")]';
	return $t->find_element_ok($xpath, 'xpath', "Find north arrow with rotation $rotation degrees");
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

	find_svg_square_ok(0, 104);
	find_svg_square_ok(312, 0);

	find_north_arrow_ok(0);

	set_secondary_axis('Test X Label', 'Test Y Label', 'tx1,tx2,tx3,tx4', 'ty1,ty2,ty3,ty4');

	find_svg_text_ok('Test X Label', 182, -42);
	find_svg_text_ok('Test X Label', 182, 208);
	find_svg_text_ok('Test Y Label', -60, 78);
	find_svg_text_ok('Test Y Label', 424, 78);

	find_svg_text_ok('tx1', 25, -26);
	find_svg_text_ok('tx1', 25, 192);
	find_svg_text_ok('ty3', -40, 30);
	find_svg_text_ok('ty3', 404, 30);

	# Click button with title "Rotate"
	$t->click_ok('//button[@title="Rotate"]', 'xpath', 'Click Rotate button');

	find_svg_text_ok('103', 25, 30);
	find_svg_text_ok('207', 77, 342);
	find_svg_text_ok('tx3', 196, 134);

	find_north_arrow_ok(90);

	# Click button with title "Transpose Display"
	$t->click_ok('//button[@title="Transpose Display"]', 'xpath', 'Click Transpose Display button');

	find_svg_text_ok('103', 337, 134);
	find_svg_text_ok('307', 25, 30);

	# Click checkbox with label containing "Invert Rows"
	$t->click_ok('//label[contains(text(),"Invert Rows")]/input', 'xpath', 'Click Invert Rows checkbox');

	find_svg_text_ok('104', 285, 30);
	find_svg_text_ok('205', 129, 82);
	find_svg_text_ok('ty3', 404, 134);
	find_svg_text_ok('tx4', 181, 192);

	# Click checkbox with label containing "Top"
	$t->click_ok('//label[contains(text(),"Top")]/input', 'xpath', 'Click Top checkbox');

	find_svg_square_ok(156, 156, $border_fill);

	# Click checkbox with label containing "Left"
	$t->click_ok('//label[contains(text(),"Left")]/input', 'xpath', 'Click Left checkbox');

	find_svg_square_ok(0, 52, $border_fill);

	# Click button with title "Rotate"
	$t->click_ok('//button[@title="Rotate"]', 'xpath', 'Click Rotate button');

	# Click checkbox with label containing "Right"
	$t->click_ok('//label[contains(text(),"Right")]/input', 'xpath', 'Click Right checkbox');

	find_svg_square_ok(208, 312, $border_fill);
	find_svg_text_ok('ty3', 181, -26);

	set_dimensions(4, undef);

	find_svg_text_ok('301', 233, 186);
	find_svg_text_ok('307', 181, 238);

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

	click_svg_square_ok(156, 104);
	$t->find_element_ok('//div[contains(@class,"show")]//tr[td[contains(text(),"Accession")]]/td[2][contains(text(),"IITA-TMS-IBA30572")]', 'xpath', 'Verify accession name IITA-TMS-IBA30572 is displayed in the details modal');
	$t->find_element_ok('//tr[td[contains(text(),"Plot Number")]]/td[2][contains(text(),"206")]', 'xpath', 'Verify plot number 206 is displayed in the details modal');
	my $coords = $t->find_element_ok('//tr[td[contains(text(),"Coordinates")]]/td[2][contains(normalize-space(),"3 / 3")]', 'xpath', 'Verify coordinates are 3 / 3');
	$t->find_element_ok('//h5[contains(text(),"Plot Contents & Structure Hierarchy:")]/following-sibling::div/pre[contains(text(),"CASS_6Genotypes_206")]', 'xpath', 'Verify plot contents and structure hierarchy is displayed in the details modal');

	$t->click_ok('//div[contains(@class,"show")]//a[contains(text(),"Replace")]', 'xpath', 'Click Replace Accession tab');
	$t->send_keys_ok('//div[contains(@class,"show")]//label[contains(normalize-space(),"Accession")]/following-sibling::div//input', 'xpath', 'XG120015', 'Set New Accession Name input to XG120015');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Update")]', 'xpath', 'Click Update Accession button');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Override")]', 'xpath', 'Click override button in modal');
	$t->accept_alert_ok('Accept alert after updating accession');

	$t->wait_for_network_idle();
	click_svg_square_ok(312, 52);
	$t->find_element_ok('//div[contains(@class,"show")]//tr[td[contains(text(),"Accession")]]/td[2][contains(text(),"XG120015")]', 'xpath', 'Verify accession name XG120015 is displayed in the details modal');
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Close")]', 'xpath', 'Click Close button in details modal');

	$t->click_ok('//label[contains(text(),"Invert Columns")]/input', 'xpath', 'Click Invert Columns checkbox');
	find_svg_text_ok('207', 77, 82);
	$t->click_ok('//button[@title="Rotate"]', 'xpath', 'Click Rotate button');
	find_svg_text_ok('207', 129, 30);
});

$t->driver->quit();
$f->clean_up_db();
done_testing();
