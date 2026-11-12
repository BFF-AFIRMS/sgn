package CXGN::List::Transform::Plugin::TraitIds2Order;

use Moose;

sub name {
    return "trait_ids_2_order";
}

sub display_name {
    return "Trait IDs to order";
}

sub can_transform {
    my $self = shift;
    my $type1 = shift;
    my $type2 = shift;

    if (($type1 eq "trait_ids") and ($type2 eq "order")) {
	return 1;
    }
    else {  return 0; }
}

my %MONTH_TO_DAYS = (
    1  => 31,
    2  => 28,
    3  => 31,
    4  => 30,
    5  => 31,
    6  => 30,
    7  => 31,
    8  => 31,
    9  => 30,
    10 => 31,
    11 => 30,
    12 => 31,
);

sub month_to_cumulative_days {
    my $month = shift;
    my $i = 1;
    my $cumulative_days = 0;
    while ($i <= $month){
        $cumulative_days = $cumulative_days + $MONTH_TO_DAYS{$month};
        $i++;
    }
    return $cumulative_days;
}

# Order traits and treatments.
# The order is determined by:
#    1. Is a treatment or trait (treatments get listed first)
#    2. Either base name or base synonym (Tree height / HT)
#    3. Chronological based on the time ontology (day, month, year)
# Example: Tree height|year 9|cm should be a lower order than Tree height|year 11|cm
sub transform {
    my $self = shift;
    my $schema = shift;
    my $list = shift;
    my $method = shift || 'synonym';

    # -------------------------------------------------------------------------
    # Identify the trait, treatment, and time ontologies.
    # These are the key pieces we will need to order the traits

    my @time_ontologies = [];
    my $time_ontology_cvterm_id = $schema->resultset('Cv::Cvterm')->find({name => 'time_ontology'})->cvterm_id();
    my $time_ontologies_rs = $schema->resultset('Cv::Cvprop')->search({type_id => $time_ontology_cvterm_id});
    while (my $record = $time_ontologies_rs->next()) {
        push(@time_ontologies, $record->cv_id());
    }

    my @trait_ontologies = [];
    my $trait_ontology_cvterm_id = $schema->resultset('Cv::Cvterm')->find({name => 'trait_ontology'})->cvterm_id();
    my $trait_ontologies_rs = $schema->resultset('Cv::Cvprop')->search({type_id => $trait_ontology_cvterm_id});
    while (my $record = $trait_ontologies_rs->next()) {
        push(@trait_ontologies, $record->cv_id());
    }

    my @treatment_ontologies = [];
    my $treatment_ontology_cvterm_id = $schema->resultset('Cv::Cvterm')->find({name => 'experiment_treatment_ontology'})->cvterm_id();
    my $treatment_ontologies_rs = $schema->resultset('Cv::Cvprop')->search({type_id => $treatment_ontology_cvterm_id});
    while (my $record = $treatment_ontologies_rs->next()) {
        push(@treatment_ontologies, $record->cv_id());
    }

    # -------------------------------------------------------------------------
    # Initialize basic information about each trait without looking at
    # composed components. Such as full name (Tree height|year 9|cm) and base
    # name (Tree height), as well as whether this is a treatment (0/1).

    my $traits = {};
    my $trait_ids = [];
    my $trait_names_rs = $schema->resultset('Cv::Cvterm')->search({cvterm_id => {-in => \@$list}});

    while (my $record = $trait_names_rs->next()) {
        my $trait_id = $record->cvterm_id();
        my $trait_name = $record->name();
        $traits->{$trait_id}->{name} = $trait_name;
        $traits->{$trait_id}->{id} = $trait_id;
        $traits->{$trait_id}->{base} = $trait_name;
        $traits->{$trait_id}->{relative_order} = 0;
        $traits->{$trait_id}->{absolute_order} = 0;

        # Check if this is a treatment
        my $trait_cv_id = $record->cv_id();
        if ( grep( /^$trait_cv_id$/, @treatment_ontologies ) ) {
            $traits->{$trait_id}->{is_treatment} = 1;
        } else {
            $traits->{$trait_id}->{is_treatment} = 0;
        }

        if ($method eq 'synonym'){
            # Check if this is a plain trait/treatment (ie. not composed)
            # If so, we can directly the pull the base synonym here
            #     name: Tree height|year 9|cm
            #     base: Tree height
            #     base_synonym: HT
            if ( grep( /^$trait_cv_id$/, @trait_ontologies ) || $traits->{$trait_id}->{is_treatment} ) {
                my $cvterm = CXGN::Cvterm->new( schema=> $schema, cvterm_id => $trait_id);
                $traits->{$trait_id}->{base_synonym} = $cvterm->get_single_synonym();
            }
        }
        push(@$trait_ids, $trait_id);        
    }

    # -------------------------------------------------------------------------
    # Note any missing traits for the final return value

    my @missing = ();
    foreach my $trait_id (@$list){
        if (! defined $traits->{$trait_id}){
            push(@missing, $trait_id);
        }
    }

    # -------------------------------------------------------------------------
    # Parse the components of composed traits
    # this includes pull out the time ontology pieces (ex. year 10, month 1, etc.)
    # the base name and base synonym name (ex. Tree height, HT)
    # as well as detecting whether it is a treatment

    my $unique_components;
    foreach my $trait_id (@$trait_ids){
        my $components = SGN::Model::Cvterm->get_components_from_trait($schema, $trait_id);  
        foreach my $component_id (@$components){
            # Check whether we've already encountered this component before
            # for example, we may see the 'year 10' component across multiple traits
            if (!$unique_components->{$component_id}){
                my $component_cvterm = $schema->resultset('Cv::Cvterm')->find({cvterm_id => $component_id});
                my $component_cv = $component_cvterm->cv_id();
                my $component_name = $component_cvterm->name();
                my $component_order = 0;

                if ( grep( /^$component_cv$/, @treatment_ontologies ) ) {
                    $unique_components->{$component_id}->{is_treatment} = 1;
                }
                if ( grep( /^$component_cv$/, @trait_ontologies ) || $unique_components->{$component_id}->{is_treatment} ) {
                    $unique_components->{$component_id}->{base} = $component_name;
                    if ($method eq 'synonym'){
                        my $cvterm = CXGN::Cvterm->new( schema=> $schema, cvterm_id => $component_id);
                        $unique_components->{$component_id}->{base_synonym} = $cvterm->get_single_synonym();
                    }
                }
                if ( grep( /^$component_cv$/, @time_ontologies ) ) {
                    my @component_split = split(' ', $component_name);
                    my ($time_unit, $time_value) = ($component_split[0], $component_split[1] + 0);
                    if ($component_name =~ /day /) { $component_order = $time_value; }
                    if ($component_name =~ /month /) { $component_order = month_to_cumulative_days($time_value) }
                    if ($component_name =~ /year /) { $component_order = $time_value * 365; }
                }
                $unique_components->{$component_id}->{order} = $component_order;
            }
            # It's possible there are multiple time components (ex. Tree height|year 9|month 3)
            # So sum all the time components for a trait            
            my $component_order = $unique_components->{$component_id}->{order};
            my $relative_order = $traits->{$trait_id}->{relative_order};
            $traits->{$trait_id}->{relative_order} = $relative_order + $component_order;

            my $component_base = $unique_components->{$component_id}->{base};
            $traits->{$trait_id}->{base} = $component_base if defined $component_base;

            my $component_treatment = $unique_components->{$component_id}->{is_treatment};
            $traits->{$trait_id}->{is_treatment} = $component_treatment if defined $component_treatment;

            if ($method eq 'synonym'){
                my $base_synonym = $unique_components->{$component_id}->{base_synonym};
                $traits->{$trait_id}->{base_synonym} = $base_synonym if defined $base_synonym;
            }
        }
    }

    # -------------------------------------------------------------------------
    # Get synonyms of base names (ex. Tree height = HT)

    if ($method eq 'synonym'){

        my $t = CXGN::List::Transform->new();
        my $synonym_list = $t->transform($schema, 'trait_ids_2_synonyms', $trait_ids);
        my $trait_synonyms = {};

        if (!scalar @{$synonym_list->{'missing'}}) {
            my @trait_synonyms = @{$synonym_list->{'transform'}};
            for my $i (0 .. $#trait_synonyms) {
                my $trait_id = @$trait_ids[$i];
                my $synonym = $trait_synonyms[$i];
                $traits->{$trait_id}->{synonym} = $synonym;
            }
        }
    }

    # -------------------------------------------------------------------------
    # Sort elements

    my $traits_ref = [];
    foreach my $trait_id (@$trait_ids){
        push(@$traits_ref, $traits->{$trait_id});
    }

    # Sort traits by preferred method (synonym or name)
    my $name_key = $method == 'synonym' ? 'base_synonym' : 'base';

    @$traits_ref = sort {
           $b->{is_treatment} <=> $a->{is_treatment}
        or $a->{$name_key} cmp $b->{$name_key}
        or $a->{relative_order} <=> $b->{relative_order}
    } @$traits_ref;

    # -------------------------------------------------------------------------
    # Final return value

    # Convert to the final transformed order
    my @transform = ();
    my $order_i = 1;
    foreach my $trait (@$traits_ref){
        my $trait_id = $trait->{id};
        push (@transform, $trait_id);
        $traits->{$trait_id}->{absolute_order} = $order_i;
        $order_i++;
    }

    return {
        transform => \@transform,
        missing => \@missing,
        mapping => $traits,
    };
}

1;
