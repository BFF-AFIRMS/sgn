use lib 't/lib';
use strict;

use Test::More;
use SGN::Test::WWW::WebDriver;
use SGN::Test::Fixture;

my $f = SGN::Test::Fixture->new();
my $t = SGN::Test::WWW::WebDriver->new();

my $schema = $f->bcs_schema;

$t->while_logged_in_as('curator', sub {

    my $trial_name = 'Spatial.Correction.Trial';
    my $analysis_name = 'Spatial Correction Analysis';
    my $model_name = 'Spatial Correction Model';
    my $trial_filename = $f->config->{basepath} . '/t/data/trial/spatial_correction_trial.xlsx';
    my $phenotypes_filename = $f->config->{basepath} . '/t/data/trial/spatial_correction_phenotypes.xlsx';

    # Upload trial
    $t->get_ok('/breeders/trials', 'Navigate to trials page');
    $t->wait_for_network_idle();
    $t->click_ok('upload_trial_link', 'name', 'click Upload Existing Trials button');
    $t->click_ok('next_step_upload_intro_button', 'id', 'click Go to Next Step');
    $t->click_ok('upload_multiple_trial_designs_tab', 'id', 'Choose Multiple Trial Designs tab');
    $t->driver()->upload_file($trial_filename);
    $t->send_keys_ok('multiple_trial_designs_upload_file', 'id', $trial_filename, 'find file input');
    $t->click_ok('multiple_trial_designs_upload_submit', 'id', 'click Upload Trial Designs');
    $t->wait_for_working_dialog();
    my $success_messages =  $t->get_attribute_ok("upload_multiple_trials_success_messages", "id", "innerHTML", "get model name");
    like($success_messages, qr/Success/, "confirm success message");

    # Upload phenotypes
    my $trial_id = $schema->resultset('Project::Project')->find({ name => $trial_name })->project_id();
    $t->get_ok("/breeders/trial/$trial_id", 'Navigate to trial page');
    $t->wait_for_network_idle();
    $t->click_ok('trial_upload_files_onswitch', 'id', 'click Upload Data Files');
    $t->click_ok('upload_spreadsheet_phenotypes_link', 'id', 'click Upload Phenotyping Spreadsheets');
    $t->click_ok('//select[@id="upload_spreadsheet_phenotype_file_format"]/option[@value="simple"]', 'xpath', 'select Simple format');
    $t->driver()->upload_file($phenotypes_filename);
    $t->send_keys_ok('upload_spreadsheet_phenotype_file_input', 'id', $phenotypes_filename, 'find file input');
    $t->click_ok('upload_spreadsheet_phenotype_submit_verify', 'id', 'click Verify');
    $t->click_ok('upload_spreadsheet_phenotype_submit_store', 'id', 'click Store');

    # Run Spatial Correction
    $t->get_ok("/breeders/trial/$trial_id", 'Navigate to trial page');
    $t->wait_for_network_idle();
    $t->click_ok('pheno_heatmap_onswitch', 'id', 'click Upload Data Files');
	$t->wait_for_working_dialog();
	$t->find_element_ok('//*[@id="fieldmap_chart_svg"]', 'xpath', 'Find fieldmap SVG');
    $t->click_ok('calculate_spatial_correction', 'id', 'click Calculate Spatial Correction');
    $t->click_ok('confirm_calculating_spatial_correction', 'id', 'click Confirm');
    $t->click_ok('check_quality_prepare_button', 'id', 'click Accept and continue');
    $t->click_ok('correct_spatial', 'id', 'click Run Spatial Correction');
    $t->click_ok('confirm_store_spatial_correction', 'id', 'click Store Spatial Correction');

    # Save Spatial Correction as Stored Analysis
    $t->click_ok('store_analysis_intro_button', 'id', 'click Go to Next Step');
    $t->click_ok('//select[@id="generic_save_analysis_analysis_to_save"]/option[@value="yes"]', 'xpath', 'select Yes to save analysis results');
    $t->send_keys_ok('generic_save_analysis_analysis_name', 'id', $analysis_name, 'enter Analysis Name');
    $t->send_keys_ok('generic_save_analysis_analysis_description', 'id', $analysis_name, 'enter Analysis Description');
    $t->click_ok('generic_save_analysis_next', 'id', 'click Go to Next Step');
    $t->send_keys_ok('generic_save_analysis_model_name', 'id', $model_name, 'enter Model Name');
    $t->send_keys_ok('generic_save_analysis_model_description', 'id', $model_name, 'enter Model Description');
    $t->click_ok('generic_save_analysis_submit_button', 'id', 'click Save Analysis Results And/Or Model');

	# Verify alert appears that the analysis/model has been saved
	$t->wait_for_alert_appear();
	my $analysis_saved_alert = $t->get_alert_text();
	is($analysis_saved_alert, 'Analysis and/or model saved!', 'Verify alert text that analysis/model saved');
	$t->accept_alert_ok('Accept analysis/model saved alert');

    # Open analysis page
    my $analysis_id = $schema->resultset('Project::Project')->find({ name => $analysis_name })->project_id();
    $t->get_ok("/analyses/$analysis_id", 'Navigate to analysis page');
    $t->wait_for_network_idle();
    my $observed_analysis_name = $t->get_attribute("trial_name", "id", "innerHTML", "get analysis name");
    like($observed_analysis_name, qr/$analysis_name/, "confirm analysis name is $analysis_name");

    # Open model page
    my $model_id = $schema->resultset('NaturalDiversity::NdProtocol')->find({ name => $model_name })->nd_protocol_id();
    $t->get_ok("/analyses_model/$model_id", 'Navigate to model page');
    $t->wait_for_network_idle();
    my $observed_model_name = $t->get_attribute("model_name", "id", "innerHTML", "get model name");
    like($observed_model_name, qr/$model_name/, "confirm model name is $model_name");

});

$t->driver->quit();
$f->clean_up_db();
done_testing();
