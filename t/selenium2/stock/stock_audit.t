#!/usr/bin/perl
use strict;
use warnings;
use Test::More;

use lib 't/lib';
use SGN::Test::WWW::WebDriver;
use SGN::Test::Fixture;

my $t = SGN::Test::WWW::WebDriver->new();
my $f = SGN::Test::Fixture->new();

sub open_additional_info_section {
    my $switch = $t->find_element('stock_additional_info_section_onswitch', 'id');
    if ($switch && $switch->is_displayed()) {
        $switch->click();
        $t->wait_for_network_idle();
    }
}

# Generic runner to execute arbitrary UI changes on a stock page and verify relevant logs
sub run_change_audit_test {
    my ($stock_id, $username, $changes) = @_;

    foreach my $change (@$changes) {
        $t->get_ok("stock/$stock_id/view");
        $t->wait_for_network_idle();

        if ($change->{type} eq 'stock_details') {
            $t->click_ok('//div[@id="stock_details_buttons"]/a[contains(text(), "Edit")]', 'xpath', 'Click stock edit button');

            while (my ($field_name, $value) = each %{$change->{fields}}) {
                $t->clear_ok($field_name, 'name', "Clear input: $field_name");
                $t->send_keys_ok($field_name, 'name', $value, "Update $field_name");
            }

            $t->click_ok('stockForm_submit_button', 'id', 'Click save details button');
            $t->wait_for_network_idle();

        } elsif ($change->{type} eq 'stock_prop' && $change->{action} eq 'INSERT') {
            open_additional_info_section();
            $t->wait_for_network_idle();

            $t->click_ok("stock_add_synonym", "id", "Open add synonym dialog");
            $t->click_ok("synonyms_select", "id", "Focus synonym selector");
            $t->click_ok('//select[@id="synonyms_select"]/option[@title="stock_synonym"]', 'xpath', "Select stock_synonym");

            my $prop_val = $change->{fields}->{value};
            $t->send_keys_ok("synonyms_prop", "id", $prop_val, "Fill synonym value");
            $t->click_ok("synonyms_addProp_submit", "id", "Submit property addition");
            $t->accept_alert();
            $t->wait_for_network_idle();

        } elsif ($change->{type} eq 'stock_prop' && $change->{action} eq 'DELETE') {
            open_additional_info_section();
            $t->wait_for_network_idle();

            my $prop_val = $change->{fields}->{value};
            $prop_val =~ s/^\s+|\s+$//g; # Strip any trailing/leading white space or newlines

            my $xpath = sprintf('//table[@id="synonyms_content"]//span[contains(@class, "stockprop-pill") and contains(., "%s")]/a[contains(@class, "stockprop-delete")]', $prop_val);
            $t->click_ok($xpath, 'xpath', 'Click delete stockprop button');
            $t->accept_alert();
            $t->accept_alert();
            $t->wait_for_network_idle();
        }
    }

    # Reload page and perform batch validation on the entire audit table after all edits
    $t->get_ok("stock/$stock_id/view");
    $t->wait_for_network_idle();

    $t->click_ok('audit_table_section_onswitch', 'id', 'Open audit table panel');
    $t->wait_for_network_idle();

    my $audit_text = $t->get_text('stock_audit_results', 'id');

    foreach my $change (@$changes) {
        my $op = $change->{action};
        my $pattern = $change->{expected_pattern};

        ok($audit_text =~ /$op/, "Batch verification: Audit logs recorded $op operation");
        ok($audit_text =~ /$username/, "Batch verification: Audit logs associated with user: $username");
        ok($audit_text =~ /$pattern/, "Batch verification: Audit details contain: $pattern");
    }
}

$t->while_logged_in_as("submitter", sub {
    run_change_audit_test(
        38879,
        'johndoe',
        [
            {
                type             => 'stock_details',
                action           => 'UPDATE',
                fields           => { description => 'Generic automated update audit testing description.' },
                expected_pattern => 'Generic automated update audit testing description.',
            },
            {
                type             => 'stock_prop',
                action           => 'INSERT',
                fields           => { value => 'generic_audit_prop_val' },
                expected_pattern => 'generic_audit_prop_val',
            }
        ]
    );

    run_change_audit_test(
        38879,
        'johndoe',
        [
            {
                type             => 'stock_details',
                action           => 'UPDATE',
                fields           => { description => 'Second automated update note.' },
                expected_pattern => 'Second automated update note.',
            },
            {
                type             => 'stock_details',
                action           => 'UPDATE',
                fields           => { description => 'Third final automated details patch.' },
                expected_pattern => 'Third final automated details patch.',
            }
        ]
    );

    run_change_audit_test(
        38879,
        'johndoe',
        [
            {
                type             => 'stock_prop',
                action           => 'INSERT',
                fields           => { value => 'temporary_audit_synonym_val' },
                expected_pattern => 'temporary_audit_synonym_val',
            },
            {
                type             => 'stock_prop',
                action           => 'DELETE',
                fields           => { value => 'temporary_audit_synonym_val' },
                expected_pattern => 'temporary_audit_synonym_val',
            }
        ]
    );
});

$t->driver->quit();
$f->clean_up_db();
done_testing();
