<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class Terra_I18n {
    // Tell Polylang the property CPT is translatable.
    public static function translatable_post_types( $types ) {
        $types['property'] = 'property';
        return $types;
    }
}
