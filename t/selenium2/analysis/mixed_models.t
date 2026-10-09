
use strict;

use lib 't/lib';
use Test::More qw| no_plan |;
use SGN::Test::Fixture;
use SGN::Test::WWW::WebDriver;

my $t = SGN::Test::WWW::WebDriver->new();
my $f = SGN::Test::Fixture->new();

$t->while_logged_in_as("curator", sub {

    # # =========================================================================
    # # Create Dataset
    # # =========================================================================
    # $t->get_ok("/breeders/search", "Navigate to Search Wizard");
    # $t->click_ok('(//div[@class="panel-heading"]/select)[1]//option[@value="trials"]', 'xpath', 'Select trials');
    # $t->click_ok('(//div[@class="panel-body"])[1]//a[contains(text(), "trial2 NaCRRI")]//preceding-sibling::button' , 'xpath', 'Add trial2 NaCRRI');
    # $t->click_ok('(//div[@class="panel-heading"]/select)[2]//option[@value="accessions"]', 'xpath', 'Select accessions');
    # $t->click_ok('(//div[@class="panel-body"])[2]//button[text()="Select All"]' , 'xpath', 'Click Select All');
    # $t->send_keys_ok("wizard-dataset-name", "class", "Mixed.Models.Dataset", "Enter Dataset Name");
    # $t->click_ok("wizard-dataset-create", "class", "Click Create Dataset");
    # # TBD: Find better solution than sleep wrappers.
    # sleep(2);
    # $t->accept_alert_ok("accept create dataset alert");
    # sleep(2);

    # =========================================================================
    # Upload Spatial Layouts
    # =========================================================================
    $t->get_ok("/breeders/trial/141", 'Navigate to trial2 NaCRRI page');
    $t->wait_for_network_idle();
    $t->click_ok('pheno_heatmap_onswitch', 'id', 'Open fieldmap section');
    $t->wait_for_working_dialog();
    my $spatial_layout_path = $f->config->{basepath} . '/t/data/trial/trial2_NaCRRI_spatial_layout.csv';
    $t->driver()->upload_file($spatial_layout_path);
    $t->click_ok('heatmap_upload_trial_coords_link', 'id', 'Click Upload Spatial Layout');
    $t->send_keys_ok('trial_coordinates_uploaded_file', 'id', $spatial_layout_path, 'Select Spatial Layout File Path');
    $t->click_ok("upload_trial_coords_ok_button", "id", "Submit Spatial Layout Upload ");
    $t->click_ok("trial_coord_upload_success_dialog_message_cancel", "id", "Close Success Message");
    $t->wait_for_network_idle();

    # =========================================================================
    # Create Mixed Model
    # =========================================================================
    # $t->get_ok('/tools/mixedmodels', 'Navigate to Mixed Models');
    # $t->click_ok('//input[@name="mixed_model_dataset_select_checkbox" and @value="2"]', 'xpath', 'Select Mixed.Models.Dataset');
    # $t->click_ok('mixed_model_analysis_fishished_choose_variable', 'id', 'Click Choose Dataset and Continue');
    # $t->click_ok('//input[contains(@value, "fresh root weight)]', 'xpath', 'Click fresh root weight');
    # $t->click_ok('mixed_model_dataset_select_checkbox', 'id', 'Click Next step');

    # $t->find_element_ok('factor_1', 'id', 'locate germplasm factor');
    # $t->find_element_ok('random_factors', 'id', 'locate random factors');
    # my $script = q{
    #     var germplasm = jQuery("#factor_1");
    #     var randomFactors = jQuery("#random_factors");
    #     randomFactors.append(germplasm[0]);
    # };
    # $t->driver->execute_script($script);
    # my $analysis_name = "Test.Analysis";
    # my $model_name = "Test.Model";
    # $t->click_ok("run_mixed_model_button", "id", "click run");

    print STDERR "\n\nsleeping\n\n";
    sleep(30000);
});

$t->driver->quit();
$f->clean_up_db();
done_testing();
