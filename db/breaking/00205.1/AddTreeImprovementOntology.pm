#!/usr/bin/env perl

=head1 NAME

AddTreeImprovementOntology.pm

=head1 SYNOPSIS

mx-run AddTreeImprovementOntology [options] [-F]

this is a subclass of L<CXGN::Metadata::Dbpatch>
see the perldoc of parent class for more details.

=head1 DESCRIPTION

This patch:
 - adds tree_improvement ontologies.

=head1 AUTHOR

Katherine Eaton

=head1 COPYRIGHT & LICENSE

Copyright 2026 University of Alberta

This program is free software; you can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

package AddTreeImprovementOntology;

use Moose;
use Bio::Chado::Schema;
use SGN::Model::Cvterm;
extends 'CXGN::Metadata::Dbpatch';

has '+description' => ( default => <<'' );
This patch adds tree_improvement ontologies.


sub patch {
    my $self=shift;

    print STDOUT "Executing the patch:\n " .   $self->name . ".\n\nDescription:\n  ".  $self->description . ".\n\nExecuted by:\n " .  $self->username . " .";

    print STDOUT "\nChecking if this db_patch was executed before or if previous db_patches have been executed.\n";

    print STDOUT "\nAdding Cvterms.\n";

    my $schema = Bio::Chado::Schema->connect( sub { $self->dbh->clone } );

    my $is_a = SGN::Model::Cvterm->get_cvterm_row($schema, 'is_a', 'relationship')->cvterm_id();
    my $variable_of = SGN::Model::Cvterm->get_cvterm_row($schema, 'VARIABLE_OF', 'relationship')->cvterm_id();
    my $trait_format  = SGN::Model::Cvterm->get_cvterm_row($schema, 'trait_format', 'trait_property')->cvterm_id();
    my $trait_categories  = SGN::Model::Cvterm->get_cvterm_row($schema, 'trait_categories', 'trait_property')->cvterm_id();
    my $trait_details  = SGN::Model::Cvterm->get_cvterm_row($schema, 'trait_details', 'trait_property')->cvterm_id();
    my $trait_repeat_type  = SGN::Model::Cvterm->get_cvterm_row($schema, 'trait_repeat_type', 'trait_property')->cvterm_id();

    my $trait_ontology = SGN::Model::Cvterm->get_cvterm_row($schema, 'trait_ontology', 'composable_cvtypes')->cvterm_id();
    my $method_ontology = SGN::Model::Cvterm->get_cvterm_row($schema, 'method_ontology', 'composable_cvtypes')->cvterm_id();
    my $object_ontology = SGN::Model::Cvterm->get_cvterm_row($schema, 'object_ontology', 'composable_cvtypes')->cvterm_id();
    my $unit_ontology = SGN::Model::Cvterm->get_cvterm_row($schema, 'unit_ontology', 'composable_cvtypes')->cvterm_id();

    my $db = $schema->resultset('General::Db')->find_or_create({ name => 'TI', description => 'Tree Improvement' });
    my $treatment_db = $schema->resultset('General::Db')->find({ name => 'EXPERIMENT_TREATMENT'});

    # ---------------------------------------------------
    # Top Level Ontologies

    my $trait_cv  = $schema->resultset('Cv::Cv')->find_or_create({ name => 'tree_improvement_trait' });
    my $method_cv = $schema->resultset('Cv::Cv')->find_or_create({ name => 'tree_improvement_method' });
    my $tissue_cv = $schema->resultset('Cv::Cv')->find_or_create({ name => 'tree_improvement_tissue' });
    my $unit_cv   = $schema->resultset('Cv::Cv')->find_or_create({ name => 'tree_improvement_unit' });
    my $treatment_cv = $schema->resultset('Cv::Cv')->find({ name => 'experiment_treatment' });

    $schema->resultset('Cv::Cvprop')->find_or_create({ cv_id => $trait_cv->cv_id(), type_id => $trait_ontology });
    $schema->resultset('Cv::Cvprop')->find_or_create({ cv_id => $method_cv->cv_id(), type_id => $method_ontology });
    $schema->resultset('Cv::Cvprop')->find_or_create({ cv_id => $tissue_cv->cv_id(), type_id => $object_ontology });
    $schema->resultset('Cv::Cvprop')->find_or_create({ cv_id => $unit_cv->cv_id(), type_id => $unit_ontology });

    my $trait_dbxref  = $schema->resultset('General::Dbxref')->find_or_create({ db_id => $db->db_id(), accession => '0000001' });
    my $method_dbxref = $schema->resultset('General::Dbxref')->find_or_create({ db_id => $db->db_id(), accession => '0000002' });
    my $tissue_dbxref = $schema->resultset('General::Dbxref')->find_or_create({ db_id => $db->db_id(), accession => '0000003' });
    my $unit_dbxref   = $schema->resultset('General::Dbxref')->find_or_create({ db_id => $db->db_id(), accession => '0000004' });

    my $trait_cvterm  = $schema->resultset('Cv::Cvterm')->find_or_create({ name => 'Tree Improvement Trait', definition => 'Tree Improvement Trait Ontology', cv_id =>  $trait_cv->cv_id(), dbxref_id => $trait_dbxref->dbxref_id() });
    my $method_cvterm = $schema->resultset('Cv::Cvterm')->find_or_create({ name => 'Tree Improvement Method', definition => 'Tree Improvement Method Ontology', cv_id =>  $method_cv->cv_id(), dbxref_id => $method_dbxref->dbxref_id() });
    my $tissue_cvterm = $schema->resultset('Cv::Cvterm')->find_or_create({ name => 'Tree Improvement Tissue', definition => 'Tree Improvement Tissue Ontology', cv_id =>  $tissue_cv->cv_id(), dbxref_id => $tissue_dbxref->dbxref_id() });
    my $unit_cvterm   = $schema->resultset('Cv::Cvterm')->find_or_create({ name => 'Tree Improvement Unit', definition => 'Tree Improvement Unit Ontology', cv_id =>  $unit_cv->cv_id(), dbxref_id => $unit_dbxref->dbxref_id() });
    my $treatment_cvterm = $schema->resultset('Cv::Cvterm')->find({ name => 'Experimental treatment ontology', cv_id => $treatment_cv->cv_id() });

    # ---------------------------------------------------
    # Traits (0000101-0000999)

    # Height
    my $height_dbxref = $schema->resultset('General::Dbxref')->find_or_create({ db_id => $db->db_id(), accession => '0000101' });
    my $height_cvterm = $schema->resultset('Cv::Cvterm')->find_or_create({ name => 'Tree height', definition => 'Height of a tree.', cv_id =>  $trait_cv->cv_id(), dbxref_id => $height_dbxref->dbxref_id() });
    $schema->resultset("Cv::CvtermRelationship")->find_or_create({subject_id => $height_cvterm->cvterm_id(), type_id => $variable_of, object_id => $trait_cvterm->cvterm_id()});
    $schema->resultset("Cv::Cvtermsynonym")->find_or_create({cvterm_id => $height_cvterm->cvterm_id(), synonym => '"HT" EXACT []' });

    # Height cm
    my $height_cm_dbxref = $schema->resultset('General::Dbxref')->find_or_create({ db_id => $db->db_id(), accession => '0000108' });
    my $height_cm_cvterm = $schema->resultset('Cv::Cvterm')->find_or_create({ name => 'Tree Height|cm', definition => 'Height of a tree measured in centimetres.', cv_id =>  $trait_cv->cv_id(), dbxref_id => $height_cm_dbxref->dbxref_id() });
    $schema->resultset("Cv::CvtermRelationship")->find_or_create({subject_id => $height_cm_cvterm->cvterm_id(), type_id => $variable_of, object_id => $height_cvterm->cvterm_id()});
    $schema->resultset("Cv::Cvtermsynonym")->find_or_create({cvterm_id => $height_cm_cvterm->cvterm_id(), synonym => '"HT cm" EXACT []' });


    # DBH
    my $dbh_dbxref = $schema->resultset('General::Dbxref')->find_or_create({ db_id => $db->db_id(), accession => '0000102' });
    my $dbh_cvterm = $schema->resultset('Cv::Cvterm')->find_or_create({ name => 'Tree diameter at breast height', definition => 'Diameter of the tree measured at breast height.', cv_id =>  $trait_cv->cv_id(), dbxref_id => $dbh_dbxref->dbxref_id() });
    $schema->resultset("Cv::CvtermRelationship")->find_or_create({subject_id => $dbh_cvterm->cvterm_id(), type_id => $variable_of, object_id => $trait_cvterm->cvterm_id()});
    $schema->resultset("Cv::Cvtermsynonym")->find_or_create({cvterm_id => $dbh_cvterm->cvterm_id(), synonym => '"DBH" EXACT []' });

    # Survival
    my $survival_dbxref = $schema->resultset('General::Dbxref')->find_or_create({ db_id => $db->db_id(), accession => '0000103' });
    my $survival_cvterm = $schema->resultset('Cv::Cvterm')->find_or_create({ name => 'Tree survival', definition => 'Surival of the tree.', cv_id =>  $trait_cv->cv_id(), dbxref_id => $survival_dbxref->dbxref_id() });
    $schema->resultset("Cv::CvtermRelationship")->find_or_create({subject_id => $survival_cvterm->cvterm_id(), type_id => $variable_of, object_id => $trait_cvterm->cvterm_id()});
    $schema->resultset("Cv::Cvtermsynonym")->find_or_create({cvterm_id => $survival_cvterm->cvterm_id(), synonym => '"SU" EXACT []' });

    # Western Gall Rust
    my $wgr_dbxref = $schema->resultset('General::Dbxref')->find_or_create({ db_id => $db->db_id(), accession => '0000104' });
    my $wgr_cvterm = $schema->resultset('Cv::Cvterm')->find_or_create({ name => 'Western gall rust', definition => 'Western gall rust disease.', cv_id =>  $trait_cv->cv_id(), dbxref_id => $wgr_dbxref->dbxref_id() });
    $schema->resultset("Cv::CvtermRelationship")->find_or_create({subject_id => $wgr_cvterm->cvterm_id(), type_id => $variable_of, object_id => $trait_cvterm->cvterm_id()});
    $schema->resultset("Cv::Cvtermsynonym")->find_or_create({cvterm_id => $wgr_cvterm->cvterm_id(), synonym => '"WGR" EXACT []' });

    # Western Gall Rust|WGR 0-1
    my $wgr_trait_01_dbxref = $schema->resultset('General::Dbxref')->find_or_create({ db_id => $db->db_id(), accession => '0000105' });
    my $wgr_trait_01_cvterm = $schema->resultset('Cv::Cvterm')->find_or_create({ name => 'Western gall rust|WGR 0-1', definition => 'Western gall rust disease measured on a scale of 0 to 1.', cv_id =>  $trait_cv->cv_id(), dbxref_id => $wgr_trait_01_dbxref->dbxref_id() });
    $schema->resultset("Cv::CvtermRelationship")->find_or_create({subject_id => $wgr_trait_01_cvterm->cvterm_id(), type_id => $variable_of, object_id => $wgr_cvterm->cvterm_id()});
    $schema->resultset("Cv::Cvtermsynonym")->find_or_create({cvterm_id => $wgr_trait_01_cvterm->cvterm_id(), synonym => '"WGR 0-1" EXACT []' });

    # Western Gall Rust|WGR 0-2
    my $wgr_trait_02_dbxref = $schema->resultset('General::Dbxref')->find_or_create({ db_id => $db->db_id(), accession => '0000106' });
    my $wgr_trait_02_cvterm = $schema->resultset('Cv::Cvterm')->find_or_create({ name => 'Western gall rust|WGR 0-2', definition => 'Western gall rust disease measured on a scale of 0 to 2.', cv_id =>  $trait_cv->cv_id(), dbxref_id => $wgr_trait_02_dbxref->dbxref_id() });
    $schema->resultset("Cv::CvtermRelationship")->find_or_create({subject_id => $wgr_trait_02_cvterm->cvterm_id(), type_id => $variable_of, object_id => $wgr_cvterm->cvterm_id()});
    $schema->resultset("Cv::Cvtermsynonym")->find_or_create({cvterm_id => $wgr_trait_02_cvterm->cvterm_id(), synonym => '"WGR 0-2" EXACT []' });

    # Western Gall Rust|WGR 0-6
    my $wgr_trait_06_dbxref = $schema->resultset('General::Dbxref')->find_or_create({ db_id => $db->db_id(), accession => '0000107' });
    my $wgr_trait_06_cvterm = $schema->resultset('Cv::Cvterm')->find_or_create({ name => 'Western gall rust|WGR 0-6', definition => 'Western gall rust disease measured on a scale of 0 to 6.', cv_id =>  $trait_cv->cv_id(), dbxref_id => $wgr_trait_06_dbxref->dbxref_id() });
    $schema->resultset("Cv::CvtermRelationship")->find_or_create({subject_id => $wgr_trait_06_cvterm->cvterm_id(), type_id => $variable_of, object_id => $wgr_cvterm->cvterm_id()});
    $schema->resultset("Cv::Cvtermsynonym")->find_or_create({cvterm_id => $wgr_trait_06_cvterm->cvterm_id(), synonym => '"WGR 0-2" EXACT []' });

    # ---------------------------------------------------
    # Method (0001001-0001999)

    # ---------------------------------------------------
    # Tissue (0002001-0002999)

    # Needle
    my $needle_dbxref = $schema->resultset('General::Dbxref')->find_or_create({ db_id => $db->db_id(), accession => '0002001' });
    my $needle_cvterm = $schema->resultset('Cv::Cvterm')->find_or_create({ name => 'needle', definition => 'Tree needle tissue.', cv_id =>  $tissue_cv->cv_id(), dbxref_id => $needle_dbxref->dbxref_id() });
    $schema->resultset("Cv::CvtermRelationship")->find_or_create({subject_id => $needle_cvterm->cvterm_id(), type_id => $is_a, object_id => $tissue_cvterm->cvterm_id()});

    # Cambium
    my $cambium_dbxref = $schema->resultset('General::Dbxref')->find_or_create({ db_id => $db->db_id(), accession => '0002002' });
    my $cambium_cvterm = $schema->resultset('Cv::Cvterm')->find_or_create({ name => 'cambium', definition => 'Tree cambium tissue.', cv_id =>  $tissue_cv->cv_id(), dbxref_id => $cambium_dbxref->dbxref_id() });
    $schema->resultset("Cv::CvtermRelationship")->find_or_create({subject_id => $cambium_cvterm->cvterm_id(), type_id => $is_a, object_id => $tissue_cvterm->cvterm_id()});

    # Cone
    my $cone_dbxref = $schema->resultset('General::Dbxref')->find_or_create({ db_id => $db->db_id(), accession => '0002003' });
    my $cone_cvterm = $schema->resultset('Cv::Cvterm')->find_or_create({ name => 'cone', definition => 'Tree cone tissue.', cv_id =>  $tissue_cv->cv_id(), dbxref_id => $cone_dbxref->dbxref_id() });
    $schema->resultset("Cv::CvtermRelationship")->find_or_create({subject_id => $cone_cvterm->cvterm_id(), type_id => $is_a, object_id => $tissue_cvterm->cvterm_id()});

    # ---------------------------------------------------
    # unit (0003001-0003999)

    # WGR 0-1
    my $wgr_01_dbxref = $schema->resultset('General::Dbxref')->find_or_create({ db_id => $db->db_id(), accession => '0003001' });
    my $wgr_01_cvterm = $schema->resultset('Cv::Cvterm')->find_or_create({ name => 'WGR 0-1', definition => 'Western gall rust scale from 0 to 1.', cv_id =>  $unit_cv->cv_id(), dbxref_id => $wgr_01_dbxref->dbxref_id() });
    $schema->resultset("Cv::CvtermRelationship")->find_or_create({subject_id => $wgr_01_cvterm->cvterm_id(), type_id => $is_a, object_id => $unit_cvterm->cvterm_id()});

    # WGR 0-2
    my $wgr_02_dbxref = $schema->resultset('General::Dbxref')->find_or_create({ db_id => $db->db_id(), accession => '0003002' });
    my $wgr_02_cvterm = $schema->resultset('Cv::Cvterm')->find_or_create({ name => 'WGR 0-2', definition => 'Western gall rust scale from 0 to 2.', cv_id =>  $unit_cv->cv_id(), dbxref_id => $wgr_02_dbxref->dbxref_id() });
    $schema->resultset("Cv::CvtermRelationship")->find_or_create({subject_id => $wgr_02_cvterm->cvterm_id(), type_id => $is_a, object_id => $unit_cvterm->cvterm_id()});

    # WGR 0-6
    my $wgr_06_dbxref = $schema->resultset('General::Dbxref')->find_or_create({ db_id => $db->db_id(), accession => '0003003' });
    my $wgr_06_cvterm = $schema->resultset('Cv::Cvterm')->find_or_create({ name => 'WGR 0-6', definition => 'Western gall rust scale from 0 to 6.', cv_id =>  $unit_cv->cv_id(), dbxref_id => $wgr_06_dbxref->dbxref_id() });
    $schema->resultset("Cv::CvtermRelationship")->find_or_create({subject_id => $wgr_06_cvterm->cvterm_id(), type_id => $is_a, object_id => $unit_cvterm->cvterm_id()});

    # ---------------------------------------------------
    # Experimental Treatments (0000002-)

    # Tree type at establishment
    my $establish_type_dbxref = $schema->resultset('General::Dbxref')->find_or_create({ db_id => $treatment_db->db_id(), accession => '0000002' });
    my $establish_type_cvterm = $schema->resultset('Cv::Cvterm')->find_or_create({ name => 'Tree type at establishment', definition => 'Type of tree that was planted at establishment. ', cv_id =>  $treatment_cv->cv_id(), dbxref_id => $establish_type_dbxref->dbxref_id() });
    $schema->resultset("Cv::CvtermRelationship")->find_or_create({subject_id => $establish_type_cvterm->cvterm_id(), type_id => $variable_of, object_id => $treatment_cvterm->cvterm_id()});

    $schema->resultset('Cv::Cvtermprop')->find_or_create({ cvterm_id => $establish_type_cvterm->cvterm_id(), type_id => $trait_categories, value => '1/2/3/4' });
    $schema->resultset('Cv::Cvtermprop')->find_or_create({ cvterm_id => $establish_type_cvterm->cvterm_id(), type_id => $trait_details, value => 'Experimental/Filler/Border/Not Planted' });
    $schema->resultset('Cv::Cvtermprop')->find_or_create({ cvterm_id => $establish_type_cvterm->cvterm_id(), type_id => $trait_format, value => 'categorical' });
    $schema->resultset('Cv::Cvtermprop')->find_or_create({ cvterm_id => $establish_type_cvterm->cvterm_id(), type_id => $trait_repeat_type, value => 'single' });

    # ---------------------------------------------------
    # Cvterm Paths

    print STDOUT "\nUpdating Cvterm Paths.\n";
    system("perl", "/home/production/cxgn/chado_tools/chado/bin/gmod_make_cvtermpath.pl", "-c", "tree_improvement_trait", "-H", $ENV{PGHOST}, "-D", $ENV{PGDATABASE},  "-d", "Pg", "-u", $ENV{PGUSER});
    system("perl", "/home/production/cxgn/chado_tools/chado/bin/gmod_make_cvtermpath.pl", "-c", "tree_improvement_method", "-H", $ENV{PGHOST}, "-D", $ENV{PGDATABASE},"-d", "Pg", "-u", $ENV{PGUSER});
    system("perl", "/home/production/cxgn/chado_tools/chado/bin/gmod_make_cvtermpath.pl", "-c", "tree_improvement_tissue", "-H", $ENV{PGHOST}, "-D", $ENV{PGDATABASE},"-d", "Pg", "-u", $ENV{PGUSER});

    print "You're done!\n";
}

####
1; #
####
