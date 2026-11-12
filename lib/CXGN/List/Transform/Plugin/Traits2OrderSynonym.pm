package CXGN::List::Transform::Plugin::Traits2OrderSynonym;

use Moose;

sub name { 
    return "traits_2_order_synonym";
}

sub display_name { 
    return "Traits to order synonym";
}

sub can_transform { 
    my $self = shift;
    my $type1 = shift;
    my $type2 = shift;

    if (($type1 eq "traits") and ($type2 eq "order_synonym")) { 
        return 1;
    } else {
        return 0;
    }
}
    

sub transform { 
    my $self = shift;
    my $schema = shift;
    my $list = shift;

    my @transform = ();
    my @missing = ();
    
    # Transform full trait names to trait ids (cvterm_id)
    my $t = CXGN::List::Transform->new();
    my $traits_2_trait_ids = $t->transform($schema, 'traits_2_trait_ids', $list);   
    my @missing_traits = @{$traits_2_trait_ids->{'missing'}};
    my @trait_ids = @{$traits_2_trait_ids->{'transform'}};

    # Transform trait ids to order (both relative and absolute)
    my $trait_ids_2_order = $t->transform($schema, 'trait_ids_2_order', \@trait_ids, 'synonym');
    my @missing_order = @{$trait_ids_2_order ->{'missing'}};
    my @missing = (@missing_traits, @missing_order);
    $trait_ids_2_order->{missing} = \@missing;

    return $trait_ids_2_order;
}

1;
