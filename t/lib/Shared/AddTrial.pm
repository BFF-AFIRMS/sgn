package Shared::AddTrial;

=head1 NAME

Shared::AddTrial - shared helpers for driving the "Design New Trial" workflow

=head1 DESCRIPTION

The Add Trial page (C</breeders/trial/create>) is a multi-step wizard rendered
by the React entrypoint C<js/source/entries/add_trial.tsx>. Every Selenium test
that exercises it has to walk the same six screens and fill the same inputs, so
this module centralises that choreography.

The wizard is a C<WorkflowPaged> wrapping a C<WorkflowAccordion>. Accordion
panels unlock (and expand) automatically as each section passes validation, so
a test that fills the sections in order never has to touch the accordion. The
C<open_accordion_panel> helper is provided for the rare test that needs to jump
around. The caller is expected to already be logged in as a submitter or
curator (see C<while_logged_in_as> in L<SGN::Test::WWW::WebDriver>).

=head1 SYNOPSIS

  use lib 't/lib';
  use Shared::AddTrial qw/ create_trial /;

  my $trial_name = create_trial($t,
      design_type => 'CRD',
      stock_list  => $accession_list_id,
      rep_count   => 1,
  );

=head1 FORM INPUTS

The DOM ids referenced here come from the section components under
C<js/source/include/add_trial/components/sections>. If an input is renamed
there, update the corresponding helper (or the relevant key in
C<%DESIGN_INPUT_IDS>) here.

=cut

use strict;
use warnings;
use Exporter qw(import);

our @EXPORT = qw/
    open_add_trial
    fill_trial_info
    fill_design_info
    fill_trial_linkage
    fill_field_map_info
    fill_plot_naming
    continue_to_review
    confirm_and_save
    finish_trial_creation
    create_trial
    select_option
    select_options
    open_accordion_panel
    random_trial_name
/;

# Form field name => DOM id of the input that edits it.
#
# Only the inputs relevant to the currently selected design are rendered, so
# fill_design_info() ignores any field whose input is absent from the page.
my %DESIGN_INPUT_IDS = (
    rep_count                  => 'rep_count',
    block_number               => 'block_number',
    col_number                 => 'col_number',
    block_size                 => 'block_size',
    max_block_size             => 'max_block_size',
    row_number                 => 'row_number',
    row_number_per_block       => 'row_number_per_block',
    col_number_per_block       => 'fieldMap_col_number',
    row_in_design_number       => 'no_of_row_in_design',
    col_in_design_number       => 'no_of_col_in_design',
    no_of_rep_times            => 'no_of_rep_times',
    no_of_block_sequence       => 'no_of_block_sequence',
    no_of_sub_block_sequence   => 'no_of_sub_block_sequence',
    greenhouse_default_plants  => 'greenhouse_default_num_plants_per_accession_val',
    num_plants_per_treatment   => 'num_plants_per_treatment',
    westcott_check_1           => 'westcott_check_1',
    westcott_check_2           => 'westcott_check_2',
    westcott_col               => 'westcott_col',
    westcott_col_between_check => 'westcott_col_between_check',
);

# A name unique enough to avoid collisions between repeated or parallel runs.
sub random_trial_name {
    my ($prefix) = @_;
    $prefix = 'Trial_selenium' unless defined $prefix && length $prefix;
    return sprintf('%s_%d', $prefix, int(rand(1_000_000)));
}

# Select a single option from a native <select> by one of its attributes.
#
# React-controlled selects only update their state when a 'change' event is
# dispatched, which is what the WebDriver wrapper's click_option() does. Prefer
# this over a bare click_ok() on an <option>, which is unreliable across
# browsers.
#
#   by - the option attribute to match against (defaults to 'value'). Use
#        'title' for selects whose options carry a human-readable title, such
#        as the trial type select.
#
# An undef or empty value is a no-op so callers can pass optional fields
# through unconditionally.
sub select_option {
    my ($t, $select_id, $value, %opts) = @_;
    return unless defined $value && length $value;

    my $by   = $opts{by} || 'value';
    my $desc = $opts{desc} || "Select '$value' for '$select_id'";

    $t->click_option_ok("//select[\@id='$select_id']/option[\@$by='$value']", 'xpath', $desc);
}

# Select several options in a native multiple <select>.
#
# WebDriver's click_option() assigns select.value, which for a multiple select
# leaves only the last option selected. Set the .selected flag on each option
# directly and dispatch a single 'change' so React reads them all back from
# selectedOptions.
sub select_options {
    my ($t, $select_id, $values, %opts) = @_;
    return unless $values && @$values;

    my $by   = $opts{by} || 'value';
    my $desc = $opts{desc} || "Select " . join(', ', @$values) . " for '$select_id'";

    my $select = $t->find_element($select_id, 'id', "Find multi-select '$select_id'");
    my $matched = $t->driver->execute_script(q{
        const select = arguments[0];
        const attr = arguments[1];
        const values = arguments[2];
        let matched = 0;
        for (const option of select.options) {
            option.selected = values.includes(option.getAttribute(attr));
            if (option.selected) matched++;
        }
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return matched;
    }, $select, $by, $values);

    die "$desc: matched $matched of " . scalar(@$values) . " options\n"
        unless $matched == @$values;
}

# Expand a collapsed panel on the design step's accordion.
#
# Panels unlock and expand automatically as sections validate, so tests that
# fill the sections in order never need this. Clicking a panel that is still
# locked triggers the "complete the preceding steps first" alert.
sub open_accordion_panel {
    my ($t, $index, %opts) = @_;
    $t->click_ok(
        "//div[\@id='trial_design_accordion_panel_${index}']//a[contains(\@class,'collapser')]",
        'xpath',
        $opts{desc} || "Expand accordion panel $index",
    );
}

# Navigate to the Add Trial page and dismiss the Intro screen.
sub open_add_trial {
    my ($t, %opts) = @_;
    $t->get_ok('/breeders/trial/create', $opts{desc} || 'Open the Add Trial page');
    $t->click_ok('next_step_intro_button', 'id', 'Advance past the Intro screen');
}

# Fill the "Trial Information" section and pick the stock and design types.
#
# Returns the trial name that was used, so callers can look the saved trial up
# in the database afterwards.
#
#   breeding_program - defaults to 'test'
#   locations        - arrayref of location names, defaults to ['test_location']
#   trial_name       - defaults to a random name (see random_trial_name)
#   trial_type       - defaults to 'misc_trial'
#   year             - defaults to '2015'
#   stock_type       - 'accession' (default), 'cross' or 'family_name'
#   design_type      - defaults to 'CRD'
#   use_same_layout  - opt in to reusing the randomization across locations
#
# Any of planting_date, plot_width, plot_length, field_size, plants_per_plot
# and description may also be supplied; the remaining inputs keep the values
# the form ships with.
sub fill_trial_info {
    my ($t, %opts) = @_;

    my $breeding_program = $opts{breeding_program} || 'test';
    my $locations        = $opts{locations}        || ['test_location'];
    my $trial_name       = $opts{trial_name}       || random_trial_name($opts{name_prefix});
    my $trial_type       = $opts{trial_type}       || 'misc_trial';
    my $year             = $opts{year}             || '2015';
    my $stock_type       = $opts{stock_type}       || 'accession';
    my $design_type      = $opts{design_type}      || 'CRD';

    select_option($t, 'select_breeding_program', $breeding_program,
        desc => "Select breeding program '$breeding_program'");

    select_options($t, 'add_project_location', $locations,
        desc => 'Select trial location(s)');

    $t->send_keys_ok('new_trial_name', 'id', $trial_name, 'Enter trial name');

    # Trial types are rendered with a human-readable title attribute.
    select_option($t, 'add_project_type', $trial_type, by => 'title',
        desc => "Select trial type '$trial_type'");

    select_option($t, 'add_project_year', $year, desc => "Select trial year '$year'");

    # Optional metadata: only touch the inputs the caller actually provides so
    # that the form's own defaults are exercised by most tests.
    $t->send_keys_ok('add_project_planting_date', 'id', $opts{planting_date}, 'Enter planting date') if $opts{planting_date};
    $t->send_keys_ok('add_project_plot_width', 'id', $opts{plot_width}, 'Enter plot width') if $opts{plot_width};
    $t->send_keys_ok('add_project_plot_length', 'id', $opts{plot_length}, 'Enter plot length') if $opts{plot_length};
    $t->send_keys_ok('new_trial_field_size', 'id', $opts{field_size}, 'Enter field size') if $opts{field_size};
    $t->send_keys_ok('add_plant_entries', 'id', $opts{plants_per_plot}, 'Enter plants per plot') if $opts{plants_per_plot};

    $t->send_keys_ok('add_project_description', 'id',
        $opts{description} || 'Trial created by an automated Selenium test',
        'Enter trial description');

    select_option($t, 'select_stock_type', $stock_type, desc => "Select stock type '$stock_type'");
    select_option($t, 'select_design_method', $design_type, desc => "Select design type '$design_type'");

    # This checkbox only renders when more than one location is selected.
    if ($opts{use_same_layout} && @$locations > 1) {
        $t->click_ok('use_same_layout', 'id', 'Reuse the same randomization across locations');
    }

    return $trial_name;
}

# Fill the "Design Information" section.
#
#   design_type - required; decides which numeric inputs are rendered
#   stock_type  - 'accession' (default), 'cross' or 'family_name'
#
# List arguments are the ids of the Breedbase lists to select:
#
#   stock_list        - the stock list, for every design except p-rep
#   unrep_stock_list  - the unreplicated list a p-rep design needs
#   rep_stock_list    - the replicated list a p-rep design needs
#   checks_list       - the checks list, for Augmented/MAD and block designs
#   seedlot_list      - the seedlot list (accession trials only)
#
# Numeric parameters are passed by their form field name (see
# %DESIGN_INPUT_IDS); those whose inputs the design does not render are
# ignored. Split plot treatments are passed as an arrayref of
# C<< { name => ..., value => ... } >> hashes.
sub fill_design_info {
    my ($t, %opts) = @_;

    my $design_type = $opts{design_type}
        or die "fill_design_info requires a design_type\n";
    my $stock_type = $opts{stock_type} || 'accession';

    # Stock list(s). A p-rep design splits stocks into an unreplicated and a
    # replicated list; every other design uses a single list.
    if ($design_type eq 'p-rep') {
        select_option($t, "list_of_unrep_${stock_type}_list_select", $opts{unrep_stock_list},
            desc => 'Select unreplicated stock list');
        select_option($t, "list_of_rep_${stock_type}_list_select", $opts{rep_stock_list},
            desc => 'Select replicated stock list');
    } else {
        my $stock_list_id = $stock_type eq 'accession'
            ? 'select_list_list_select'
            : "select_${stock_type}_list_list_select";
        select_option($t, $stock_list_id, $opts{stock_list}, desc => 'Select stock list');
    }

    # Checks list. Augmented/MAD expose a dedicated "checks" list, while the
    # block designs expose the CRBD-specific one.
    if ($opts{checks_list}) {
        my $prefix = ($design_type eq 'Augmented' || $design_type eq 'MAD') ? '' : 'crbd_';
        my $checks_id = $stock_type eq 'accession'
            ? "${prefix}list_of_checks_section_list_select"
            : "${prefix}list_of_${stock_type}_checks_section_list_select";
        select_option($t, $checks_id, $opts{checks_list}, desc => 'Select checks list');
    }

    # Seedlots are only offered for accession trials.
    if ($stock_type eq 'accession' && $opts{seedlot_list}) {
        select_option($t, 'select_seedlot_list_list_select', $opts{seedlot_list},
            desc => 'Select seedlot list');
        $t->send_keys_ok('num_seed_per_plot', 'id', $opts{num_seed_per_plot}, 'Enter seeds per plot')
            if $opts{num_seed_per_plot};
    }

    # Split plot treatments. The form renders two treatment rows by default and
    # grows the list each time the "add treatment" button is clicked.
    if ($opts{treatments}) {
        my $index = 0;
        for my $treatment (@{ $opts{treatments} }) {
            $index++;
            if ($index > 2) {
                $t->click_ok('create_trial_with_treatment_additional_treatment_buton', 'id',
                    'Add another treatment row');
            }
            $t->send_keys_ok("create_trial_with_treatment_name_input${index}", 'id',
                $treatment->{name}, "Enter treatment $index name");
            $t->send_keys_ok("create_trial_with_treatment_value_input${index}", 'id',
                $treatment->{value}, "Enter treatment $index value");
        }
    }

    # Numeric design parameters. Skip any input the current design did not
    # render rather than waiting out WebDriver's timeout for it.
    for my $field (keys %DESIGN_INPUT_IDS) {
        next unless defined $opts{$field};
        my $input_id = $DESIGN_INPUT_IDS{$field};
        next unless @{ $t->driver->find_elements($input_id, 'id') || [] };
        $t->send_keys_ok($input_id, 'id', $opts{$field}, "Enter $field");
    }
}

# Fill the "Trial Linkage" section. Every argument is optional; omitted fields
# keep the form's default ("no").
#
#   trial_sourced     - 'yes'/'no'; when 'yes', pass source_trials
#   source_trials     - arrayref of preceding trial ids
#   will_be_genotyped - 'yes'/'no'
#   will_be_crossed   - 'yes'/'no'
sub fill_trial_linkage {
    my ($t, %opts) = @_;

    select_option($t, 'add_project_trial_sourced', $opts{trial_sourced},
        desc => 'Select whether this trial follows up a previous trial');

    if (($opts{trial_sourced} || '') eq 'yes' && $opts{source_trials}) {
        select_options($t, 'add_project_trial_source_select', $opts{source_trials},
            desc => 'Select preceding trial(s)');
    }

    select_option($t, 'add_project_trial_will_be_genotyped', $opts{will_be_genotyped},
        desc => 'Select genotyping intent');
    select_option($t, 'add_project_trial_will_be_crossed', $opts{will_be_crossed},
        desc => 'Select crossing intent');
}

# Fill the "Field Map Information" section. Both arguments are optional and are
# skipped for designs that hide the field map inputs (Alpha, MAD, greenhouse,
# p-rep, Westcott).
#
#   rows   - number of field map rows
#   layout - 'serpentine' or 'zigzag'
sub fill_field_map_info {
    my ($t, %opts) = @_;

    if (defined $opts{rows} && @{ $t->driver->find_elements('fieldMap_row_number', 'id') || [] }) {
        $t->send_keys_ok('fieldMap_row_number', 'id', $opts{rows}, 'Enter number of field map rows');
    }

    if ($opts{layout} && @{ $t->driver->find_elements('plot_layout_format', 'id') || [] }) {
        select_option($t, 'plot_layout_format', $opts{layout},
            desc => "Select plot layout format '$opts{layout}'");
    }
}

# Fill the "Custom Plot Naming" section. Every argument is optional.
#
#   numbering_scheme - 'block_based' or 'consecutive'
#   prefix           - plot name prefix
#   start_number     - one of the select's options ('1', '101', '1001')
#   increment        - plot number increment
sub fill_plot_naming {
    my ($t, %opts) = @_;

    if ($opts{numbering_scheme}) {
        my $radio_id = $opts{numbering_scheme} eq 'consecutive' ? 'consecutive' : 'block_based';
        $t->click_ok($radio_id, 'id', "Select plot numbering scheme '$opts{numbering_scheme}'");
    }

    $t->send_keys_ok('plot_prefix', 'id', $opts{prefix}, 'Enter plot prefix') if defined $opts{prefix};
    select_option($t, 'start_number', $opts{start_number},
        desc => "Select plot start number '$opts{start_number}'") if $opts{start_number};
    $t->send_keys_ok('increment', 'id', $opts{increment}, 'Enter plot number increment') if defined $opts{increment};
}

# Submit the design step and wait for the generated layout to appear.
sub continue_to_review {
    my ($t, %opts) = @_;
    $t->click_ok('new_trial_submit', 'id',
        $opts{desc} || 'Submit design and continue to the review step');
    $t->wait_for_working_dialog();
    $t->wait_for_network_idle();
}

# Confirm the reviewed design and save the trial to the database.
sub confirm_and_save {
    my ($t, %opts) = @_;
    $t->click_ok('new_trial_confirm_submit', 'id', $opts{desc} || 'Confirm and save the trial');
    $t->wait_for_working_dialog();
    $t->wait_for_network_idle();
}

# Click through the final "trial was saved" screen.
sub finish_trial_creation {
    my ($t, %opts) = @_;
    # Two elements share this id; only the one inside the shown completion
    # message is the visible button, so target it through its container.
    $t->click_ok(
        '//div[@class="panel-body"]//div[@class="workflow-complete-message workflow-message-show"]//button[@id="create_trial_success_complete_button"]',
        'xpath',
        $opts{desc} || 'Finish the workflow on the completion screen',
    );
    $t->wait_for_network_idle();
}

# Walk the entire Add Trial workflow with the given options and return the name
# of the trial that was saved.
#
# Options are forwarded to the individual section helpers; see their POD above
# for the accepted keys.
sub create_trial {
    my ($t, %opts) = @_;

    open_add_trial($t);
    my $trial_name = fill_trial_info($t, %opts);
    fill_design_info($t, %opts);
    fill_trial_linkage($t, %opts);
    fill_field_map_info($t, %opts);
    fill_plot_naming($t, %opts);

    continue_to_review($t);
    confirm_and_save($t);
    finish_trial_creation($t);

    return $trial_name;
}

1;
