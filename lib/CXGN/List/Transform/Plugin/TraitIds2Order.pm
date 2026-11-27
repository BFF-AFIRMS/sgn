package CXGN::List::Transform::Plugin::TraitIds2Order;

use Moose;
use CXGN::Trait;

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

# Order traits and treatments.
# The order is determined by:
#    1. Is a treatment or trait (ex. if you want treatments listed first)
#    2. Either base trait name or base trait synonym (Tree height vs. HT)
#    3. Chronological based on the time ontology (day, month, year)
# Example: Tree height|year 9|cm should be a lower order than Tree height|year 11|cm
sub transform {
    my $self = shift;
    my $schema = shift;
    my $list = shift;
    my $other = shift;
    my $params = shift || {};

    # Parse parameter values
    my $method = defined $params->{method} ? $params->{method} : 'name';
    my $treatment_first = defined $params->{treatment_first} ? $params->{treatment_first} : 0;

    # Identify the time ontologies
    my @time_ontologies = [];
    my $time_ontology_cvterm_id = $schema->resultset('Cv::Cvterm')->find({name => 'time_ontology'})->cvterm_id();
    my $time_ontologies_rs = $schema->resultset('Cv::Cvprop')->search({type_id => $time_ontology_cvterm_id});
    while (my $record = $time_ontologies_rs->next()) {
        push(@time_ontologies, $record->cv_id());
    }

    # Initialize basic information about each trait (name, synonym, treatment, etc.)
    my @traits = map {CXGN::Trait->new({bcs_schema=>$schema, cvterm_id=>$_})} @$list;
    my $traits = {};
    my $unique_components = {};

    foreach my $trait (@traits){
        my $trait_id = $trait->cvterm_id();
        $traits->{$trait_id}->{id} = $trait_id + 0;
        $traits->{$trait_id}->{relative_order} = 0;
        $traits->{$trait_id}->{name} = $trait->name();
        $traits->{$trait_id}->{display_name} = $trait->display_name();
        $traits->{$trait_id}->{base_name} = $trait->base_trait()->name();
        $traits->{$trait_id}->{is_treatment} = $trait->is_treatment();

        my $synonym = $trait->synonym();
        my $base_synonym = $trait->base_trait()->synonym();
        $traits->{$trait_id}->{synonym} = defined $synonym ? $synonym : $traits->{$trait_id}->{name};
        $traits->{$trait_id}->{base_synonym} = defined $base_synonym ? $base_synonym : $traits->{$trait_id}->{base_name};

        my $components = SGN::Model::Cvterm->get_components_from_trait($schema, $trait_id);
        foreach my $component_id (@$components){
            # Check whether we've already encountered this component before to save on db calls
            # for example, we may see the 'year 10' component across multiple traits
            if (!$unique_components->{$component_id}){
                my $component_cvterm = $schema->resultset('Cv::Cvterm')->find({cvterm_id => $component_id});
                my $component_cv = $component_cvterm->cv_id();
                my $component_order = 0;
                if ( grep( /^$component_cv$/, @time_ontologies ) ) {
                    my $component_name = $component_cvterm->name();
                    my @component_split = split(' ', $component_name);
                    my ($time_unit, $time_value) = ($component_split[0], $component_split[1] + 0);
                    if ($component_name =~ /day /) { $component_order = $time_value; }
                    if ($component_name =~ /month /) { $component_order = $time_value * 30 }
                    if ($component_name =~ /year /) { $component_order = $time_value * 365; }
                }
                $unique_components->{$component_id}->{order} = $component_order;
            }
            # It's possible there are multiple time components (ex. Tree height|year 9|month 3)
            # So sum all the time components for a trait
            my $component_order = $unique_components->{$component_id}->{order};
            my $relative_order = $traits->{$trait_id}->{relative_order};
            $traits->{$trait_id}->{relative_order} = $relative_order + $component_order;
        }
    }

    # Sort elements
    my $base_key = $method eq 'synonym' ? 'base_synonym' : 'base_name';
    my $name_key = $method eq 'synonym' ? 'synonym' : 'name';
    my @unsorted_traits = map {$traits->{$_}} keys %$traits;
    my @sorted_traits;

    if ($treatment_first){
        @sorted_traits = sort {
            $b->{is_treatment} <=> $a->{is_treatment}
            or uc($a->{$base_key}) cmp uc($b->{$base_key})
            or $a->{relative_order} <=> $b->{relative_order}
            or uc($a->{$name_key}) cmp uc($b->{$name_key})
        } @unsorted_traits;
    } else {
        @sorted_traits = sort {
            uc($a->{$base_key}) cmp uc($b->{$base_key})
            or $a->{relative_order} <=> $b->{relative_order}
            or uc($a->{$name_key}) cmp uc($b->{$name_key})
        } @unsorted_traits;
    }

    foreach my $i (0..$#sorted_traits){
        my $trait_id = $sorted_traits[$i]->{id};
        $traits->{$trait_id}->{absolute_order} = $i + 1;
    }

    # -------------------------------------------------------------------------
    # Final return value

    my @transform = map { $_->{id} } @sorted_traits;
    my @missing = map {! defined $traits->{$_} ? $_ : () } @$list;

    return {
        transform => \@transform,
        missing => \@missing,
        mapping => $traits,
    };
}

1;
