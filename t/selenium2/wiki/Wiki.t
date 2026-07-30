
use strict;

use lib 't/lib';

use Test::More qw| no_plan |;
use SGN::Test::Fixture;
use SGN::Test::WWW::WebDriver;

my $d = SGN::Test::WWW::WebDriver->new();

my $f = SGN::Test::Fixture->new();

$d->while_logged_in_as("curator", sub {

    # -------------------------------------------------------------------------
    # General Functionality

    # Attempt to navigate to WikiHome, which is a page that doesn't exist yet,
    # so an alert will be raised. We do not use get_ok here, because it can't load
    $d->driver->get("/wiki/WikiHome");
    $d->accept_alert_ok();

    # Create the WikiHome page
    $d->send_keys_ok("wiki_page_content", "id", "#Big Title!\n##Smaller Title\nBla bla bla\n", "find wiki_page_content text area");
    $d->click_ok("save_wiki_page_button", "id", "find wiki page save button");

    # Check WikiHome page contents
    my $contents = $d->get_attribute_ok("wiki_page_markdown", "id", "innerHTML", "find content of wiki page");
    like($contents, qr/Big Title\!/, "check page contents");
    like($contents, qr/Smaller Title/, "check more page contents");
    like($contents, qr/Bla bla bla/, "check even more page contents");

    # Create a second version of the page
    $d->click_ok("edit_wiki_page_button", "id", "find wiki page edit button");
    $d->send_keys_ok("wiki_page_content", "id", "This is the new content of version 2", "find wiki_page_content text area");
    $d->click_ok("save_wiki_page_button", "id", "find save wiki page button");

    # Check second version contents
    $contents = $d->get_attribute_ok("wiki_page_markdown", "id", "innerHTML", "find content of wiki page");
    like($contents, qr/This is the new content of version 2/, "check page contents version 2");

    # Create a new unrelated page
    create_page("AnotherTestPage", "More Stuff");
    $contents = $d->get_attribute_ok("wiki_page_markdown", "id", "innerHTML", "find content of wiki page");
    like($contents, qr/More Stuff/, "check another test page contents");

    # Rename new page
    $d->click_ok("rename_wiki_page_button", "id", "find rename wiki page button");
    $d->send_keys_ok("wiki_page_name_new", "id", "Rename", "rename new page");
    $d->click_ok("submit_rename_wiki_page_button","id", "submit page rename");
    $d->accept_alert_ok("confirm rename");
    $d->wait_for_network_idle();

    # Delete new page
    delete_page("AnotherTestPageRename");

    # -------------------------------------------------------------------------
    # Overview Section Setup

    # Create a genotyping project
    my $genotyping_project_name = "Test.Genotyping";
    $d->get_ok("/breeders/genotyping_projects", "navigate to genotyping projects");
    $d->click_ok("create_genotyping_project_link", "name", "click create genotyping project");
    $d->click_ok("next_step_add_new_genotyping_project", "id", "click next step");
    $d->send_keys_ok("new_genotyping_project_name", "id", $genotyping_project_name, "enter project name");
    $d->send_keys_ok("genotyping_project_description", "id", $genotyping_project_name, "enter project description");
    $d->click_ok('//select[@id="data_type"]/option[@value="snp"]', 'xpath', 'select snp data type');
    $d->click_ok("add_new_genotyping_project_submit", "id", "submit new genotyping project");
    $d->click_ok("add_new_genotyping_project_close_modal", "id", "close modal");
    my $genotyping_project_id = $f->bcs_schema->resultset('Project::Project')->find({ name => $genotyping_project_name })->project_id();

    # Create genotyping plate
    my $genotyping_plate_name = "plate1";
    $d->click_ok("create_genotyping_trial_link", "name", "click create genotyping plate");
    $d->click_ok("next_step_intro_button", "id", "click next step 1");
    $d->click_ok("next_step_creating_genotyping_plates", "id", "click next step 2");
    $d->click_ok("//select[\@id='plate_genotyping_project_id']/option[\@title='$genotyping_project_name']", 'xpath', 'select genotyping project');
    $d->send_keys_ok("genotyping_trial_name", "id", $genotyping_plate_name, "enter plate id");
    $d->click_ok("plate_info_intro_button", "id", "click next step 3");
    $d->click_ok('//select[@id="genotyping_trial_well_input_option"]/option[text()="I need to design a completely new plate"]', "xpath", "click design new plate");
    $d->click_ok('//select[@id="accession_select_box_list_select"]/option[text()="test_stocks"]', "xpath", "select accessions");
    $d->click_ok("well_info_intro_button", "id", "click next step 4");
    $d->click_ok("trial_linkage_intro_button", "id", "click next step 5");
    $d->click_ok("add_geno_trial_submit", "id", "click submit plate");
    $d->wait_for_working_dialog();
    my $genotyping_plate_id = $f->bcs_schema->resultset('Project::Project')->find({ name => $genotyping_plate_name })->project_id();

    # Create small dataset using wizard for analysis
    $d->get_ok("/breeders/search", "navigate to search wizard");
    $d->click_ok('(//div[@class="panel-heading"]/select)[1]//option[@value="trials"]', 'xpath', 'select trials');
    $d->click_ok('(//div[@class="panel-body"])[1]//a[contains(text(), "Kasese solgs trial")]//preceding-sibling::button' , 'xpath', 'add Kasese solgs trial');
    $d->click_ok('(//div[@class="panel-heading"]/select)[2]//option[@value="traits"]', 'xpath', 'select traits');
    $d->click_ok('(//div[@class="panel-body"])[2]//a[contains(text(), "fresh root weight")]//preceding-sibling::button' , 'xpath', 'add fresh root weight trait');
    $d->click_ok('(//div[@class="panel-heading"]/select)[3]//option[@value="plots"]', 'xpath', 'select plots');
    foreach my $suffix (1000 .. 1009) {
        my $plot_name = "KASESE_TP2013_$suffix";
        $d->click_ok("(//div[\@class='panel-body'])[3]//a[contains(text(), '$plot_name')]//preceding-sibling::button" , 'xpath', "add $plot_name");
    }
    $d->send_keys_ok("wizard-dataset-name", "class", "Test.Dataset", "enter dataset name");
    $d->click_ok("wizard-dataset-create", "class", "click create dataset");
    # TBD: Find better solution than sleep wrappers.
    sleep(2);
    $d->accept_alert_ok();
    sleep(2);

    # Create analysis and model
    $d->get_ok("/tools/mixedmodels", "navigate to mixed models");
    $d->click_ok('//input[@value=2]', "xpath", "select dataset");
    $d->click_ok("mixed_model_analysis_prepare_button", "id", "click continue button");
    $d->click_ok('//input[@value="fresh root weight|CO_334:0000012"]', 'xpath', 'click fresh root weight');
    $d->click_ok('mixed_model_analysis_fishished_choose_variable', 'id', 'click next step');

    # I'm not sure how to get drag and drop working with selenium driver,
    # so execute with javascript instead
    $d->find_element_ok('factor_1', 'id', 'locate germplasm factor');
    $d->find_element_ok('random_factors', 'id', 'locate random factors');
    my $script = q{
        var germplasm = jQuery("#factor_1");
        var randomFactors = jQuery("#random_factors");
        randomFactors.append(germplasm[0]);
    };
    $d->driver->execute_script($script);
    my $analysis_name = "Test.Analysis";
    my $model_name = "Test.Model";
    $d->click_ok("run_mixed_model_button", "id", "click run");

    # Store analysis and model
    $d->click_ok("open_store_adjusted_blups_dialog_button", "id", "click store adjusted means");
    $d->click_ok("store_analysis_intro_button", "id", "click next step intro");
    $d->click_ok('//select[@id="generic_save_analysis_analysis_to_save"]/option[@value="yes"]', "xpath", "click save results");
    $d->send_keys("generic_save_analysis_analysis_name", "id", $analysis_name, "enter analysis name");
    $d->send_keys("generic_save_analysis_analysis_description", "id", $analysis_name, "enter analysis description");
    $d->click_ok("generic_save_analysis_next", "id", "click next analysis intro");
    $d->send_keys("generic_save_analysis_model_name", "id", $model_name, "enter model name");
    $d->send_keys("generic_save_analysis_model_description", "id", $model_name, "enter model description");
    $d->click_ok("generic_save_analysis_submit_button", "id", "click save button");
    # Wait for it to load
    $d->wait_for_working_dialog();

    my $analysis_id = $f->bcs_schema->resultset('Project::Project')->find({ name => $analysis_name })->project_id();
    my $model_id = $f->bcs_schema->resultset('NaturalDiversity::NdProtocol')->find({ name => $model_name })->nd_protocol_id();

    # -------------------------------------------------------------------------
    # Overview Section Tests

    my @overviews = (
        # page_name                                 url
        ["breedingProgram134",                      "/breeders/program/134"],
        ["trial139",                                "/breeders/trial/139"],
        ["genotypingProtocol1",                     "/breeders_toolbox/protocol/1"],
        ["genotypingProject$genotyping_project_id", "/breeders/trial/$genotyping_project_id"],
        ["genotypingPlate$genotyping_plate_id",     "/breeders/trial/$genotyping_plate_id"],
        ["analysis$analysis_id",                    "/analyses/$analysis_id"],
        ["model$model_id",                          "/analyses_model/$model_id"],
    );

    foreach my $overview (@overviews){
        my ($page_name, $url) = @$overview;

        # Check empty overview
        $d->get_ok($url);
        $d->wait_for_network_idle();
        my $contents = $d->get_attribute_ok("overview_$page_name", "id", "innerHTML", "get empty overview $page_name");
        like($contents, qr/No overview has been created yet/, "confirm no overview $page_name");

        # Create wiki page
        my $overview = "This is a test overview for $page_name";
        create_page("$page_name", $overview);
        
        # Confirm link to page
        $d->get_ok($url);
        $d->wait_for_network_idle();
        $contents = $d->get_attribute_ok("overview_$page_name", "id", "innerHTML", "get filled overview $page_name");
        like($contents, qr/$overview/, "confirm overview content $page_name");

        # Cleanup
        delete_page("$page_name");
    }

    # -------------------------------------------------------------------------
    # Cleanup

    # Check if homepage still exists
    $d->get_ok("/wiki/WikiHome", "get wiki home page");
    $contents = $d->get_attribute_ok("wiki_page_markdown", "id", "innerHTML", "find content of wiki page");
    like($contents, qr/Big Title\!/, "check page contents");
    like($contents, qr/Smaller Title/, "check more page contents");
    like($contents, qr/Bla bla bla/, "check even more page contents");

    # Delete homepage
    $d->click_ok("delete_wiki_page_button", "id", "find delete wiki page button");
    $d->accept_alert_ok();

});

$d->driver->quit();
$f->clean_up_db();
done_testing();

sub delete_page {
    my $page_name = shift;
    $d->get_ok("/wiki/$page_name");
    $d->click_ok("delete_wiki_page_button", "id", "find delete wiki page button");
    $d->accept_alert_ok("confirm deletion");
    $d->accept_alert_ok("accept successful deletion");
}

sub create_page {
    my $page_name = shift;
    my $content = shift;

    $d->get_ok("/wiki/WikiHome");   
    $d->click_ok("new_wiki_page_button", "id", "click new wiki page button");
    $d->send_keys_ok("wiki_page_name", "id", $page_name, "enter new page name $page_name");
    $d->click_ok("create_wiki_page_button","id", "click create page button");
    $d->send_keys_ok("wiki_page_content", "id", "$content", "enter wiki page content");
    $d->click_ok("save_wiki_page_button", "id", "save wiki page");
}
