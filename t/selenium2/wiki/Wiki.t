
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

    # Attemt to navigate to WikiHome, which is a page that doesn't exist yet,
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
    # Overview Sections

    my @overviews = (
        # page_name             url
        ["breedingProgram134",  "/breeders/program/134"],
        ["trial139",            "/breeders/trial/139"],
        ["genotypingProtocol1", "/breeders_toolbox/protocol/1"],
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
