use strict;
use warnings;

package SGN::Controller::AJAX::Audit;

use Moose;
use Data::Dumper;
use File::Temp qw | tempfile |;
use File::Slurp;
use File::Spec qw | catfile|;
use File::Basename qw | basename |;
use File::Copy;
use CXGN::Dataset;
use CXGN::Dataset::File;
use CXGN::Tools::Run;
use Cwd qw(cwd);
use JSON;
use Encode;

BEGIN { extends 'Catalyst::Controller::REST' };

__PACKAGE__->config(
    default   => 'application/json',
    stash_key => 'rest',
    map       => { 'application/json' => 'JSON' },
    );

    
sub retrieve_results : Path('/ajax/audit/retrieve_results'){
    my $self = shift;
    my $c = shift;
    my $drop_menu_option = $c->req->param('db_table_list_id');
    my $q = "select * from audit.".$drop_menu_option.";";

    my $h = $c->dbc->dbh->prepare($q);
    $h->execute();
    my @all_audits;
    my $counter = 0;

    while (my ($audit_ts, $operation, $username, $logged_in_user, $before, $after, $transactioncode, $primary_key, $is_undo) = $h->fetchrow_array) {
        # Ensure UTF-8 encoding for text fields to prevent encoding issues
        $before = defined $before ? Encode::decode('UTF-8', $before, Encode::FB_DEFAULT) : "";
        $after  = defined $after  ? Encode::decode('UTF-8', $after, Encode::FB_DEFAULT)  : "";

        $all_audits[$counter] = [$audit_ts, $operation, $username, $logged_in_user, $before, $after, $transactioncode, $primary_key, $is_undo];
        $counter++;
    }

    # Encode result properly before sending to response
    my $json_string = encode_json(\@all_audits);
    utf8::encode($json_string); # Convert to UTF-8 bytes

    $c->stash->{rest} = {
        result => $json_string,
        };
};

sub retrieve_table_names : Path('/ajax/audit/retrieve_table_names'){
    my $self = shift;
    my $c = shift;
    my $q = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'audit'";
    my $h = $c->dbc->dbh->prepare($q);
    $h->execute();
    my @ids;
    while (my ($drop_options) = $h->fetchrow_array) {
        # Ensure UTF-8 decoding
        push @ids, Encode::decode('UTF-8', $drop_options, Encode::FB_DEFAULT);
    }

    # Encode result properly before sending to response
    my $json_string = encode_json(\@ids);
    utf8::encode($json_string); # Convert to UTF-8 bytes

    $c->stash->{rest} = {
        result1 => $json_string,
        };
};

sub retrieve_stock_audits : Path('/ajax/audit/retrieve_stock_audits'){
    my $self = shift;
    my $c = shift;
    my $stock_id = $c->req->param('stock_id');
    my $q = "SELECT a.audit_ts, 'stock' AS log_source, a.operation, p_b.username AS logged_in_username, 
            CASE WHEN c_b.name IS NOT NULL THEN jsonb_set(a.before, '{type}', to_jsonb(c_b.name)) - 'type_id' ELSE a.before END AS before, 
            CASE WHEN c_a.name IS NOT NULL THEN jsonb_set(a.after, '{type}', to_jsonb(c_a.name)) - 'type_id' ELSE a.after END AS after, 
            a.transactioncode, a.stock_audit_id, a.is_undo
        FROM audit.stock_audit a
        LEFT JOIN cvterm c_b ON a.before->>'type_id' = c_b.cvterm_id::text
        LEFT JOIN cvterm c_a ON a.after->>'type_id' = c_a.cvterm_id::text
        LEFT JOIN sgn_people.sp_person p_b ON a.logged_in_user = p_b.sp_person_id
        WHERE a.before->>'stock_id' = ? OR a.after->>'stock_id' = ?
        UNION ALL
        SELECT a.audit_ts, 'stockprop' AS log_source, a.operation, p_p.username AS logged_in_username, 
            CASE WHEN c_b.name IS NOT NULL THEN jsonb_set(a.before, '{type}', to_jsonb(c_b.name)) - 'type_id' ELSE a.before END AS before, 
            CASE WHEN c_a.name IS NOT NULL THEN jsonb_set(a.after, '{type}', to_jsonb(c_a.name)) - 'type_id' ELSE a.after END AS after, 
            a.transactioncode, a.stockprop_audit_id, a.is_undo
        FROM audit.stockprop_audit a
        LEFT JOIN cvterm c_b ON a.before->>'type_id' = c_b.cvterm_id::text
        LEFT JOIN cvterm c_a ON a.after->>'type_id' = c_a.cvterm_id::text
        LEFT JOIN sgn_people.sp_person p_p ON a.logged_in_user = p_p.sp_person_id
        WHERE a.before->>'stock_id' = ? OR a.after->>'stock_id' = ?
        ORDER BY audit_ts ASC;";

    my $h = $c->dbc->dbh->prepare($q);
    $h->execute($stock_id, $stock_id, $stock_id, $stock_id);
    my @all_audits;

    while (my ($audit_ts, $log_source, $operation, $logged_in_username, $before, $after, $transactioncode, $primary_key, $is_undo) = $h->fetchrow_array) {
        # Ensure UTF-8 encoding for text fields to prevent encoding issues
        $before = defined $before ? Encode::decode('UTF-8', $before, Encode::FB_DEFAULT) : "";
        $after  = defined $after  ? Encode::decode('UTF-8', $after, Encode::FB_DEFAULT)  : "";

        push @all_audits, [$audit_ts, $log_source, $operation, $logged_in_username // '', $before, $after, $transactioncode, $primary_key, $is_undo];
    }

    my $stock_match_json = encode_json(\@all_audits);
    utf8::encode($stock_match_json); # Convert to UTF-8 bytes

    $c->stash->{rest} = {
        stock_match_after => $stock_match_json,
    }
};


sub retrieve_trial_audits : Path('/ajax/audit/retrieve_trial_audits'){
    my $self = shift;
    my $c = shift;
    my $trial_id = $c->req->param('trial_id');
    my $q = "SELECT * FROM audit.project_audit;";
    my $h = $c->dbc->dbh->prepare($q);
    $h->execute();
    my @all_audits;
    my @before;
    my @after;
    my $counter = 0;

    while (my ($audit_ts, $operation, $username, $logged_in_user, $before, $after, $transactioncode, $primary_key, $is_undo) = $h->fetchrow_array) {
        $after[$counter] = $after;
        $before[$counter] = $before;
        $all_audits[$counter] = [$audit_ts, $operation, $username, $logged_in_user, $before, $after, $transactioncode, $primary_key, $is_undo];
        $counter++;
        }

    
    my @matches;
    my $num_matches = 0; #this is to make sure only matched audits go into the matches array

    for (my $i = 0; $i < $counter; $i++) {
        my $operation = $all_audits[$i][1];
        my $json_string;

        eval {
            my $json_text = ($operation eq "DELETE") ? $before[$i] : $after[$i];

            # Convert Perl Unicode string to UTF-8 encoded bytes before decoding JSON
            $json_text = Encode::encode('UTF-8', $json_text);
            $json_string = decode_json($json_text);
        };
        if ($@) {
            warn "Failed to decode JSON at index $i: $@";
            next; # Skip this iteration in case of error
        }

        my $desired_trial_id = $json_string->{'project_id'};
        
        if ($trial_id eq $desired_trial_id) {
            $matches[$num_matches] = $all_audits[$i];
            $num_matches++;
        }
    }

    # Encode result properly before sending to response
    my $match_trial_json = encode_json(\@matches);
    utf8::encode($match_trial_json); # Convert to UTF-8 bytes

    $c->stash->{rest} = {
        match_project => $match_trial_json,
        }
};
