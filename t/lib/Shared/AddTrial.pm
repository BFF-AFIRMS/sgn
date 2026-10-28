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
  use Shared::AddTrial qw/ create_trial design_preset find_trial /;

  # Spell out the design parameters yourself...
  my $trial_name = create_trial($t,
      design_type => 'CRD',
      stock_list  => $accession_list_id,
      rep_count   => 1,
  );

  # ...or let design_preset fill in the ones a design type requires.
  my $trial_name = create_trial($t, %{ design_preset('CRD',
      stock_list => $accession_list_id,
  ) });

  # Then assert on what was actually saved.
  my $trial = find_trial($schema, $trial_name);

=head1 FORM INPUTS

The DOM ids referenced here come from the section components under
C<js/source/include/add_trial/components/sections>. If an input is renamed
there, update the corresponding helper (or the relevant key in
C<%DESIGN_INPUT_IDS>) here.

=head1 DESIGN PRESETS

C<design_preset($design_type, %overrides)> returns a hashref of options for
C<create_trial>/C<fill_design_info> with the numeric parameters that a design
type needs to pass validation already filled in. Fixture-specific values (list
ids and accession names) are always passed as overrides:

  my $opts = design_preset('Augmented',
      stock_list  => $accession_list_id,
      checks_list => $checks_list_id,
  );

The following overrides are required, in addition to C<stock_list> for every
design except C<p-rep>:

  Augmented  checks_list
  MAD        checks_list
  splitplot  treatments
  p-rep      unrep_stock_list, rep_stock_list, row_in_design_number,
             col_in_design_number (rows x columns must equal
             unreplicated + replicated x no_of_rep_times)
  Westcott   westcott_check_1, westcott_check_2

=head1 DATABASE ASSERTIONS

Helpers for asserting on what a test actually saved, which is far more stable
than scraping the wizard's DOM:

  my $trial = find_trial($schema, $trial_name);
  ok($trial, "trial was saved");

  is(count_trial_plots($schema, $trial->project_id), 4, "four plots");

C<count_trial_stocks($schema, $trial_id, $stock_type_name)> counts stocks of an
arbitrary type (C<plot>, C<plant>, ...).

=cut

use strict;
use warnings;
use Exporter qw(import);
use SGN::Model::Cvterm;

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
    select_autocomplete
    open_accordion_panel
    random_trial_name
    design_preset
    find_trial
    count_trial_stocks
    count_trial_plots
    count_trial_plants
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

# Design inputs that render an autocomplete widget rather than a plain text
# input. Typing into them updates the form value, but the canonical value is
# only committed once a suggestion is picked, so they are handled separately
# from the numeric inputs in %DESIGN_INPUT_IDS.
my %AUTOCOMPLETE_FIELDS = map { $_ => 1 } qw(
    westcott_check_1
    westcott_check_2
);

# The minimum numeric/structural parameters each design type needs to pass
# validation. Everything here is independent of the fixture database; list ids
# and accession names are always supplied by the caller (see
# %DESIGN_REQUIRED_OPTIONS and design_preset()).
my %DESIGN_PRESETS = (
    'CRD'        => { rep_count => 1 },
    'RCBD'       => { block_number => 2 },
    'RRC'        => { block_number => 2, rows => 4 },
    'DRRC'       => { rep_count => 2, col_number => 4 },
    'URDD'       => { block_number => 2, row_in_design_number => 4, col_in_design_number => 4 },
    'Alpha'      => { rep_count => 2, block_size => 2 },
    'Lattice'    => { rep_count => 2 },
    'Augmented'  => { max_block_size => 5 },
    'MAD'        => { row_number => 4, col_number => 4 },
    'greenhouse' => { greenhouse_default_plants => 1 },
    'splitplot'  => { block_number => 2, num_plants_per_treatment => 2 },
    'p-rep'      => { no_of_rep_times => 2 },
    'Westcott'   => { westcott_col => 6 },
);

# Options a design type needs on top of its preset defaults. These are the
# fixture-specific values (list ids, accession names) that cannot be baked into
# %DESIGN_PRESETS above.
my %DESIGN_REQUIRED_OPTIONS = (
    'Augmented' => [qw( checks_list )],
    'MAD'       => [qw( checks_list )],
    'splitplot' => [qw( treatments )],
    'p-rep'     => [qw( unrep_stock_list rep_stock_list row_in_design_number col_in_design_number )],
    'Westcott'  => [qw( westcott_check_1 westcott_check_2 )],
);

# A name unique enough to avoid collisions between repeated or parallel runs.
sub random_trial_name {
    my ($prefix) = @_;
    $prefix = 'Trial_selenium' unless defined $prefix && length $prefix;
    return sprintf('%s_%d', $prefix, int(rand(1_000_000)));
}

# Return the option hash for a design type, merging the design's preset defaults
# with the caller's overrides. Dies if a required override is missing so a test
# fails immediately instead of timing out in the browser.
sub design_preset {
    my ($design_type, %overrides) = @_;

    my $defaults = $DESIGN_PRESETS{$design_type}
        or die "Unknown design type '$design_type'. Known types: "
            . join(', ', sort keys %DESIGN_PRESETS) . "\n";

    # Every design except p-rep selects a single stock list.
    my @required = $design_type eq 'p-rep' ? () : ('stock_list');
    push @required, @{ $DESIGN_REQUIRED_OPTIONS{$design_type} || [] };

    my @missing = grep { !defined $overrides{$_} } @required;
    die "design_preset('$design_type') is missing required option(s): "
        . join(', ', @missing) . "\n" if @missing;

    return { %$defaults, design_type => $design_type, %overrides };
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

# Choose a value from an autocomplete input (AccessionAutocomplete,
# CvtermAutocomplete, ...).
#
# These widgets render the suggestion list in a <ul> that is a sibling of the
# input, and only commit the canonical value once a suggestion is clicked, so
# typing alone is not enough. The value must match one of the rendered
# suggestions exactly.
sub select_autocomplete {
    my ($t, $input_id, $value, %opts) = @_;
    return unless defined $value && length $value;

    my $desc = $opts{desc} || "Select autocomplete suggestion '$value' for '$input_id'";

    $t->send_keys_ok($input_id, 'id', $value, "Type '$value' into '$input_id'", clear => 1);

    $t->click_ok(
        "//input[\@id='$input_id']/following-sibling::ul[contains(\@class,'dropdown-menu')]"
            . "//a[normalize-space()='$value']",
        'xpath',
        $desc,
    );
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

    # Greenhouse designs give each accession its own plant count. The inputs
    # follow the order of the selected stock list, so locate each one by the
    # label beside it rather than relying on the index. Pass a hashref of
    # accession name => plant count.
    if ($design_type eq 'greenhouse' && $opts{greenhouse_num_plants}) {
        my $counts = $opts{greenhouse_num_plants};
        for my $stock_name (sort keys %$counts) {
            $t->send_keys_ok(
                "//div[\@id='greenhouse_num_plants_per_accession']"
                    . "/div[label[normalize-space()='$stock_name:']]//input",
                'xpath',
                $counts->{$stock_name},
                "Enter greenhouse plant count for '$stock_name'",
            );
        }
    }

    # Autocomplete fields commit their value when a suggestion is picked, so
    # they cannot be filled by typing alone.
    for my $field (sort keys %AUTOCOMPLETE_FIELDS) {
        next unless defined $opts{$field};
        my $input_id = $DESIGN_INPUT_IDS{$field};
        next unless @{ $t->driver->find_elements($input_id, 'id') || [] };
        select_autocomplete($t, $input_id, $opts{$field}, desc => "Select $field");
    }

    # Numeric design parameters. Skip any input the current design did not
    # render rather than waiting out WebDriver's timeout for it.
    for my $field (keys %DESIGN_INPUT_IDS) {
        next unless defined $opts{$field};
        next if $AUTOCOMPLETE_FIELDS{$field};
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

    # A design that fails to generate stays on the design step and reports the
    # reason through alert() *and* an .alert-danger element. wait_for_network_idle
    # has already dismissed the alert by now, so read the element instead of
    # letting the caller time out searching for a review screen that will never
    # render.
    my $deadline = time() + 5;
    while (time() < $deadline) {
        last if @{ $t->driver->find_elements('new_trial_confirm_submit', 'id') || [] };
        sleep(1);
    }
    return if @{ $t->driver->find_elements('new_trial_confirm_submit', 'id') || [] };

    my @errors = @{ $t->driver->find_elements(
        '//div[contains(@class,"alert-danger")]', 'xpath') || [] };
    my $reason = @errors
        ? $errors[0]->get_text()
        : 'no error message shown on the design step';
    die "Design generation failed: $reason\n";
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

# Find a saved trial by name. Returns the Project::Project row, or undef.
sub find_trial {
    my ($schema, $trial_name) = @_;
    return $schema->resultset('Project::Project')->find({ name => $trial_name });
}

# Ids of the nd_experiments linked to a trial (usually exactly one).
sub _trial_nd_experiment_ids {
    my ($schema, $trial_id) = @_;
    my $rs = $schema->resultset('NaturalDiversity::NdExperimentProject')
        ->search({ project_id => $trial_id });
    return [ map { $_->nd_experiment_id } $rs->all ];
}

# Count the stocks of a given stock type (e.g. 'plot', 'plant') belonging to a
# trial.
sub count_trial_stocks {
    my ($schema, $trial_id, $stock_type_name) = @_;

    my $experiment_ids = _trial_nd_experiment_ids($schema, $trial_id);
    return 0 unless @$experiment_ids;

    my $stock_type_id = SGN::Model::Cvterm->get_cvterm_row(
        $schema, $stock_type_name, 'stock_type'
    )->cvterm_id();

    return $schema->resultset('NaturalDiversity::NdExperimentStock')->search(
        {
            nd_experiment_id => { -in => $experiment_ids },
            'stock.type_id'  => $stock_type_id,
        },
        { join => 'stock' },
    )->count;
}

sub count_trial_plots {
    my ($schema, $trial_id) = @_;
    return count_trial_stocks($schema, $trial_id, 'plot');
}

sub count_trial_plants {
    my ($schema, $trial_id) = @_;
    return count_trial_stocks($schema, $trial_id, 'plant');
}

1;
