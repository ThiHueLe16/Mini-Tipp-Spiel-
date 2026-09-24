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

    private String role = "USER"; // Default role if not provided

    @Builder.Default
    @Column(nullable = false)
    private Integer totalPoints = 0;

    @Builder.Default
    @Column(nullable = false)
    private Boolean hasClaimedTrikot = false;

    private String shippingAddress;
    private String trikotSize; // e.g., "M", "L", "XL"

    // Pre-persist hook ensures values are NEVER null when saving to DB
    @PrePersist
    public void prePersist() {
        if (this.hasClaimedTrikot == null) {
            this.hasClaimedTrikot = false;
        }
        if (this.totalPoints == null) {
            this.totalPoints = 0;
        }
        if (this.role == null) {
            this.role = "USER";
        }
    }
}
