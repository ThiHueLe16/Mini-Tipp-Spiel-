package com.check24.minitippspiel.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "matches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String homeTeam;

    @Column(nullable = false)
    private String awayTeam;

    @Column(nullable = false)
    private Instant kickoffTime;

    private Integer finalHomeGoals;
    private Integer finalAwayGoals;

    @Builder.Default
    @Column(nullable = false)
    private boolean isEvaluated = false;

//    Establishes the @OneToMany relationship so fetching a Match returns its list of events.
//    orphanRemoval = true ensures deleted/replaced events are removed from the database automatically.
    @OneToMany(mappedBy = "match", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<MatchEvent> events = new ArrayList<>();
}
