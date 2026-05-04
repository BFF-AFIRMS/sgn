use strict;

use lib 't/lib';

use Test::More 'tests' => 16;
use SGN::Test::Fixture;
use SGN::Test::WWW::WebDriver;
use CXGN::List;
use SimulateC;

my $d = SGN::Test::WWW::WebDriver->new();

$d->while_logged_in_as( "submitter",  sub {
        $d->get_ok( "/search", "get root url test" );

        my $out = $d->find_element_ok( "lists_link", "name", "find lists_link" ) ->click();
        print "Adding new list...\n";

        $d->set_value_ok("add_list_input", "id", "find add list input", "new_test_list_accession_validation_fail");

        $d->find_element_ok( "add_list_button", "id",
            "find add list button test" )->click();

        $d->find_element_ok(
            "view_list_new_test_list_accession_validation_fail",
            "id", "view list test" )->click();

        $d->set_value_ok("dialog_add_list_item", "id", "add test list", "element11\nelement22\nelement33\n");

        $d->find_element_ok( "dialog_add_list_item_button", "id",
            "find dialog_add_list_item_button test" )->click();

        $d->find_element_ok("type_select", "id", "validate list select")->click();

        $d->find_element_ok("//select[\@id='type_select']/option[\@name='accessions']", 'xpath', "Select 'accessions' as value for list type")->click();

        $d->find_element_ok( "list_item_dialog_validate", "id",
            "submit list validate" )->click();
        
        $d->wait_for_working_dialog();

        my $validation_result = $d->find_element_ok(
            '//div[@id="validate_accession_error_display"]//div[@class="modal-content"]',
            'xpath',
            "find content of validation modal")->get_attribute('innerHTML');

        ok($validation_result =~ /List Validation Report: Failed/, "Verify first validation result: 'List Validation Report: Failed'");
        ok($validation_result =~ /element11/, "Verify first validation result: 'element11'");
        ok($validation_result =~ /element22/, "Verify first validation result: 'element22'");
        ok($validation_result =~ /element33/, "Verify first validation result: 'element33'");

        $d->find_element_ok( "close_missing_accessions_dialog", "id",
            "find close missing accession dialog button" )->click();
});

$d->driver->close();
done_testing();


