package com.donation.Donation.repository;

import com.donation.Donation.model.Donations;
import com.donation.Donation.model.Status;
import com.donation.Donation.model.User;
import io.lettuce.core.dynamic.annotation.Param;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;

public interface DonationRepository extends JpaRepository<Donations,Integer> {
    List<Donations> findByStatus(Status stat);



    List<Donations> findByDonorAndStatus(User donor, Status status);

    List<Donations> findByClaimedByNgoAndStatus(User user, Status status);

    @Modifying
    @Query("UPDATE Donations d SET d.donor = NULL WHERE d.donor = :donor")
    void updateDonorToNull(@Param("donor") User donor);

    @Modifying
    @Query("UPDATE Donations d SET d.claimedByNgo = NULL WHERE d.claimedByNgo = :ngo")
    void updateNgoToNull(@Param("ngo") User ngo);

    @Modifying
    @Transactional
    @Query("DELETE FROM Donations d WHERE d.donor IS NULL AND d.claimedByNgo IS NULL")
    int deleteOrphanedDonations();


    boolean existsByDonorAndStatus(User user, Status status);

    boolean existsByClaimedByNgoAndStatus(User user, Status status);

    void deleteByDonorAndStatus(User user, Status status);

    // Find available donations for NGOs (filtered & sorted)
    @Query("SELECT d FROM Donations d WHERE d.status = 'AVAILABLE' " +
            "AND (:foodCategory IS NULL OR d.itemName = :foodCategory) " +
            "AND (:expirationDate IS NULL OR d.bestBeforeDate <= :expirationDate)")
    List<Donations> findAvailableDonations(
            @Param("foodCategory") String foodCategory,
            @Param("expirationDate") LocalDate expirationDate,
            Sort sort
    );

    // Find claimed donations for NGOs (filtered & sorted)
    @Query("SELECT d FROM Donations d WHERE d.claimedByNgo = :ngo " +
            "AND (:foodCategory IS NULL OR d.itemName = :foodCategory) " +
            "AND (:expirationDate IS NULL OR d.bestBeforeDate <= :expirationDate)")
    List<Donations> findClaimedDonationsByNgo(
            @Param("ngo") User ngo,
            @Param("foodCategory") String foodCategory,
            @Param("expirationDate") LocalDate expirationDate,
            Sort sort
    );

    // Find past donations for Donors (filtered & sorted)
    @Query("SELECT d FROM Donations d WHERE d.donor = :donor " +
            "AND (:foodCategory IS NULL OR d.itemName = :foodCategory) " +
            "AND (:expirationDate IS NULL OR d.bestBeforeDate <= :expirationDate)")
    Page<Donations> findPastDonationsByDonor(
            @Param("donor") User donor,
            @Param("foodCategory") String foodCategory,
            @Param("expirationDate") LocalDate expirationDate,
            Pageable pageable
    );

}
