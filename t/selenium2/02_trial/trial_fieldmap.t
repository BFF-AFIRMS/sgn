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

$t->while_logged_in_as("curator", sub {
	$t->get_ok('/breeders/trial/165', 'Navigate to trial page');

	$t->click_ok('pheno_heatmap_onswitch', 'id', 'Open fieldmap section');
	$t->wait_for_working_dialog();

	# Assert there is a square at 1,1 (translate(0, 104))
	$t->find_element_ok('//*[local-name()="svg" and @id="fieldmap_chart_svg"]//*[local-name()="g" and @transform="translate(0, 104)"]', 'xpath', 'Find plot square at 1,1');

	# Assert there is a square at 7,3 (translate(312, 0))
	$t->find_element_ok('//*[local-name()="svg" and @id="fieldmap_chart_svg"]//*[local-name()="g" and @transform="translate(312, 0)"]', 'xpath', 'Find plot square at 7,3');

	# Click "Change Secondary Axis" button
	$t->click_ok('//button[@title="Change Secondary Axis"]', 'xpath', 'Click Change Secondary Axis button');

	# Fill input with sibling label containing "Secondary X Axis Label"
	$t->send_keys_ok('//label[contains(text(),"Secondary X Axis Label")]/following-sibling::input', 'xpath', 'Test X Label', 'Enter new secondary x axis label');

	# Fill input with sibling label containing "Secondary Y Axis Label"
	$t->send_keys_ok('//label[contains(text(),"Secondary Y Axis Label")]/following-sibling::input', 'xpath', 'Test Y Label', 'Enter new secondary y axis label');

	# Fill input with sibling label containing "Secondary X Axis Values"
	$t->send_keys_ok('//label[contains(text(),"Secondary X Axis Values")]/following-sibling::input', 'xpath', 'tx1,tx2,tx3,tx4', 'Enter new secondary x axis values');

	# Fill input with sibling label containing "Secondary Y Axis Values"
	$t->send_keys_ok('//label[contains(text(),"Secondary Y Axis Values")]/following-sibling::input', 'xpath', 'ty1,ty2,ty3,ty4', 'Enter new secondary y axis values');

	# Click "Apply" button inside div with class "show"
	$t->click_ok('//div[contains(@class,"show")]//button[contains(text(),"Apply")]', 'xpath', 'Click Apply button');

	# Assert text containing "Test X Label" with attributes x="182" y="-42"
	$t->find_element_ok('//*[local-name()="svg" and @id="fieldmap_chart_svg"]//*[local-name()="text" and text()="Test X Label" and @x="182" and @y="-42"]', 'xpath', 'Find Test X Label text element');

	# Assert text containing "Test X Label" with attributes x="182" y="208"
	$t->find_element_ok('//*[local-name()="svg" and @id="fieldmap_chart_svg"]//*[local-name()="text" and text()="Test X Label" and @x="182" and @y="208"]', 'xpath', 'Find Test Y Label text element');

	# Assert text containing "Test Y Label" with attributes x="-60" y="78"
	$t->find_element_ok('//*[local-name()="svg" and @id="fieldmap_chart_svg"]//*[local-name()="text" and text()="Test Y Label" and @x="-60" and @y="78"]', 'xpath', 'Find Test Y Label text element');

	# Assert text containing "Test Y Label" with attributes x="424" y="78"
	$t->find_element_ok('//*[local-name()="svg" and @id="fieldmap_chart_svg"]//*[local-name()="text" and text()="Test Y Label" and @x="424" and @y="78"]', 'xpath', 'Find Test Y Label text element');

	# Assert text containing "tx1" with attributes x="25" y="-26"
	$t->find_element_ok('//*[local-name()="svg" and @id="fieldmap_chart_svg"]//*[local-name()="text" and text()="tx1" and @x="25" and @y="-26"]', 'xpath', 'Find tx1 text element');

	# Assert text containing "tx1" with attributes x="25" y="192"
	$t->find_element_ok('//*[local-name()="svg" and @id="fieldmap_chart_svg"]//*[local-name()="text" and text()="tx1" and @x="25" and @y="192"]', 'xpath', 'Find tx1 text element');

	# Assert text containing "ty3" with attributes x="-40" y="30"
	$t->find_element_ok('//*[local-name()="svg" and @id="fieldmap_chart_svg"]//*[local-name()="text" and text()="ty3" and @x="-40" and @y="30"]', 'xpath', 'Find ty3 text element');

	# Assert text containing "ty3" with attributes x="404" y="30"
	$t->find_element_ok('//*[local-name()="svg" and @id="fieldmap_chart_svg"]//*[local-name()="text" and text()="ty3" and @x="404" and @y="30"]', 'xpath', 'Find ty3 text element');

	# Click button with title "Rotate"
	$t->click_ok('//button[@title="Rotate"]', 'xpath', 'Click Rotate button');

	# Assert text containing "103" with attributes x="25" y="30"
	$t->find_element_ok('//*[local-name()="svg" and @id="fieldmap_chart_svg"]//*[local-name()="text" and text()="103" and @x="25" and @y="30"]', 'xpath', 'Find rotated plot number 103 text element');

	# Assert text containing "207" with attributes x="77" y="342"
	$t->find_element_ok('//*[local-name()="svg" and @id="fieldmap_chart_svg"]//*[local-name()="text" and text()="207" and @x="77" and @y="342"]', 'xpath', 'Find rotated plot number 207 text element');

	# Assert text containing "tx3" with attributes x="196" y="134"
	$t->find_element_ok('//*[local-name()="svg" and @id="fieldmap_chart_svg"]//*[local-name()="text" and text()="tx3" and @x="196" and @y="134"]', 'xpath', 'Find rotated tx3 text element');

	# Click button with title "Transpose Display"
	$t->click_ok('//button[@title="Transpose Display"]', 'xpath', 'Click Transpose Display button');

	# Assert text containing "103" with attributes x="337" y="134"
	$t->find_element_ok('//*[local-name()="svg" and @id="fieldmap_chart_svg"]//*[local-name()="text" and text()="103" and @x="337" and @y="134"]', 'xpath', 'Find transposed plot number 103 text element');

	# Assert text containing "307" with attributes x="25" y="30"
	$t->find_element_ok('//*[local-name()="svg" and @id="fieldmap_chart_svg"]//*[local-name()="text" and text()="307" and @x="25" and @y="30"]', 'xpath', 'Find transposed plot number 307 text element');

	# Click checkbox with label containing "Invert Rows"
	$t->click_ok('//label[contains(text(),"Invert Rows")]/input', 'xpath', 'Click Invert Rows checkbox');

	# Assert text containing "104" with attributes x="285" y="30"
	$t->find_element_ok('//*[local-name()="svg" and @id="fieldmap_chart_svg"]//*[local-name()="text" and text()="104" and @x="285" and @y="30"]', 'xpath', 'Find inverted plot number 104 text element');

	# Assert text containing "205" with attributes x="129" y="82"
	$t->find_element_ok('//*[local-name()="svg" and @id="fieldmap_chart_svg"]//*[local-name()="text" and text()="205" and @x="129" and @y="82"]', 'xpath', 'Find inverted plot number 205 text element');

	# Assert text containing "ty3" with attributes x="404" y="134"
	$t->find_element_ok('//*[local-name()="svg" and @id="fieldmap_chart_svg"]//*[local-name()="text" and text()="ty3" and @x="404" and @y="134"]', 'xpath', 'Find inverted ty3 text element');

	# Assert text containing "tx4" with attributes x="181" y="192"
	$t->find_element_ok('//*[local-name()="svg" and @id="fieldmap_chart_svg"]//*[local-name()="text" and text()="tx4" and @x="181" and @y="192"]', 'xpath', 'Find tx4 text element');
});

$t->driver->close();
done_testing();
