use lib 't/lib';
use strict;

use Test::More;

use SGN::Test::WWW::WebDriver;
use SGN::Test::Fixture;
my $t = SGN::Test::WWW::WebDriver->new();
my $f = SGN::Test::Fixture->new();

# Context notes:
# The SVG has ID: fieldmap_chart_svg
# 
# Plot squares are positioned with transform="translate(x,y)":
# <g transform="translate(52, 104)" class="tw:cursor-pointer">
#   <rect width="50" height="50" rx="4" fill="#41b6c4" stroke="green" stroke-width="1.5"></rect>
# </g>

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

$t->while_logged_in_as("curator", sub {
	$t->get_ok('/breeders/trial/165', 'Navigate to trial page');

	$t->click_ok('pheno_heatmap_onswitch', 'id', 'Open fieldmap section');
	$t->wait_for_working_dialog();

	find_svg_square_ok(0, 104);
	find_svg_square_ok(312, 0);

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
});

$t->driver->close();
done_testing();
