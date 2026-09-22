package com.check24.minitippspiel.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "app_users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @Builder.Default
    @Column(nullable = false)
    private int totalPoints = 0;

    @Builder.Default
    @Column(nullable = false)
    private boolean hasClaimedTrikot = false;

    private String shippingAddress;
    private String trikotSize; // e.g., "M", "L", "XL"
}